import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";

export class ActivitiesController {
    private static instance: ActivitiesController;
    private SapServices: SapServices;
    private dataBaseServices: DatabaseServices;
    private LocalFiscalDataClass: LocalFiscalDataClass;

    constructor() {
        this.SapServices = SapServices.getInstance();
        this.dataBaseServices = DatabaseServices.getInstance();
        this.LocalFiscalDataClass = LocalFiscalDataClass.getInstance();
    }

    public static getInstance(): ActivitiesController {
        if (!ActivitiesController.instance) {
            ActivitiesController.instance = new ActivitiesController();
        }
        return ActivitiesController.instance;
    }

    public async deactiveTickets(type: string, userId: string | null) {
        try {
            const tickets: interfaces.TicketNumber[] = await this.getTickets(type, userId);

            console.log(`Starting deactivation of ${tickets.length} tickets!`);


            const ticketsProcessados: interfaces.TicketNumber[] = [];
            const ticketsErros: any[] = [];

            await Promise.all(tickets.map(async (ticket) => {
                try {
                    this.SapServices.deactivateTicket(ticket.ClgCode),
                        console.log(`ticket ${ticket.ClgCode} desativado com sucesso`)
                    ticketsProcessados.push({ ClgCode: ticket.ClgCode });
                } catch (err: any) {
                    ticketsErros.push({ ClgCode: ticket.ClgCode, error: err.message });
                }
            }))

            const retorno = helperFunctions.handleMultipleProcessesResult(ticketsErros, ticketsProcessados);

            return retorno
        } catch (err: any) {
            throw new HttpError(err.statusCode || 500, 'Erro ao desativar todos os tickets do vendedor: ' + err.message);
        }
    }

    public async createFollowUpActivities(documents: interfaces.Document[]) {
        const createdTickets: any = [];
        const errorTickets: any = [];

        await Promise.all(documents.map(async (doc) => await this.createTicketController(doc, createdTickets, errorTickets)))

        return [createdTickets, errorTickets];
    }

    private async createTicketController(Document: interfaces.Document, createdTickets: any[], errorTickets: any[]) {
        const DocNum = Document.DocNum;
        try {
            const { CardCode, ActivityCode } = await this.createFollowUpTicket(Document);
            console.log(`Created ticket ${ActivityCode} successfully`);
            createdTickets.push({ DocNum, CardCode, ActivityCode });
        } catch (err: any) {
            errorTickets.push({ DocNum, Error: err.message })
        }
    }


    private async createFollowUpTicket(Document: interfaces.Document) {
        try {
            const { DocNum, DocType } = Document;

            const FieldsWanted = [{ field: 'A."CardCode"' }, { field: 'D."USERID"' }];
            const { CardCode, USERID } = await this.SapServices.getDataFromQuotation(DocNum, FieldsWanted);
            console.log(CardCode, USERID)
            if (!CardCode || !USERID || typeof CardCode !== "string" || typeof USERID !== "number") {
                throw new HttpError(500, "No Valid CardCode or userId was found for Document.");
            }
            //Se for user id 173 (vago) não criar? - Vou deixar criando, não vai atrapalhar ninguem e depois podemos mover não sei


            const date = new Date();
            const nextWorkDay = helperFunctions.addWorkDays(date, 1).toISOString().split("T")[0];

            const Notes = `Ticket de acompanhamento para o(a) ${DocType} ${DocNum}`;
            const ActivityDate = nextWorkDay;
            const ActivityTime = '08:00:00';
            const EndDueDate = nextWorkDay;
            const EndTime = '08:05:00';
            const Duration = '5';
            const DurationType = 'du_Minuts';
            const ReminderPeriod = '15';
            const ReminderType = 'du_Minuts';
            const StartDate = nextWorkDay;
            const StartTime = ActivityTime;
            const ActivityType = 10;
            const Subject = DocType == "Orçamento" ? 90 : 98
            const HandledBy = USERID;


            const Activity = {
                ActivityDate,
                ActivityTime,
                CardCode,
                Duration,
                DurationType,
                EndDueDate,
                EndTime,
                Closed: "tNO" as "tNO" | "tYES",
                Reminder: 'tYES' as "tNO" | "tYES",
                ReminderPeriod,
                ReminderType,
                StartDate,
                StartTime,
                Notes,
                Activity: "cn_Other",
                ActivityType,
                Subject,
                HandledBy
            }

            const ticket = await this.SapServices.createTicket(Activity);
            //if nothing is throw, data is suposed to be instanciated 100%
            return ticket.data;
        } catch (err: any) {
            throw new HttpError(err.statusCode ?? 500, "Erro ao criar ticket: " + err.message);
        }
    }

    private async getTickets(type: string, userId: string | null): Promise<interfaces.TicketNumber[]> {
        let tickets: interfaces.TicketNumber[] = [];
        if (type == "Vendor") {
            if (userId == null) {
                throw new HttpError(400, "Id de usuario não recebido ao procurar por vendedor")
            }
            const parsedUserId = parseInt(userId);
            if (isNaN(parsedUserId)) {
                throw new HttpError(400, 'Id de usuário inválido');
            }
            tickets = await this.SapServices.getOpenTicketsFromVendor(parsedUserId);
        } else if (type == "OldTickets") {
            const date = new Date(new Date().getFullYear(), 9, 17);
            tickets = await this.SapServices.getOpenTicketsFromBefore(date);
        } else if (type == "Pending") {
            if (userId == null) {
                throw new HttpError(400, "Id de usuario não recebido ao procurar por pendentes")
            }
            const parsedUserId = parseInt(userId);
            if (isNaN(parsedUserId)) {
                throw new HttpError(400, 'Id de usuário inválido');
            }
            tickets = await this.SapServices.getPendingTicketsFromVendor(parsedUserId);
        }



        return tickets;
    }

    public async changeTicketsOwnerShip(originUserId: string, destinyUserId: string) {
        try {
            if (!originUserId || !destinyUserId) {
                throw new HttpError(400, 'Nenhum Id de usuário encontrado');
            }

            const parsedOriginUserId = parseInt(originUserId);
            const parsedDestinyUserId = parseInt(destinyUserId);
            if (isNaN(parsedOriginUserId) || isNaN(parsedDestinyUserId)) {
                throw new HttpError(400, 'Id de usuário inválido');
            }

            const getTickets = await this.SapServices.getOpenTicketsFromVendor(parsedOriginUserId);
            if (getTickets.length === 0) {
                throw new HttpError(404, 'Nenhum ticket encontrado para o vendedor');
            }

            const ticketsProcessados: any[] = [];
            const ticketsErros: any[] = [];

            await Promise.all(getTickets.map(async (ticket) => { await this.ChangeTicketOwner(ticket, parsedDestinyUserId, ticketsProcessados, ticketsErros) }))

            const apiReturn = helperFunctions.handleMultipleProcessesResult(ticketsErros, ticketsProcessados);
            return apiReturn;
        } catch (err: any) {
            if (err instanceof HttpErrorWithDetails) {
                throw err;
            }
            throw new HttpError(err.statusCode || 500, 'Erro ao mudar proprietário dos tickets: ' + err.message);
        }
    }

    public async changeTicketOwnerShipRegion(region: string, destinyUserId: string) {
        const parsedRegion = parseInt(region);
        const parsedDestinyUserId = parseInt(destinyUserId);
        if (isNaN(parsedRegion) || isNaN(parsedDestinyUserId)) {
            throw new HttpError(400, 'Id de usuário inválido');
        }

        const tickets = await this.SapServices.getOpenTicketsFromRegion(parsedRegion, parsedDestinyUserId);
        if (tickets.length === 0) {
            throw new HttpError(404, `Nenhum ticket encontrado para a região ${parsedRegion}`);
        }

        console.log(`Starting process to change owners: ${tickets.length} tickets.`)

        const ticketsProcessados: any[] = [];
        const ticketsErros: any[] = [];

        await Promise.all(tickets.map(async (ticket) => { await this.ChangeTicketOwner(ticket, parsedDestinyUserId, ticketsProcessados, ticketsErros) }))

        const apiReturn = helperFunctions.handleMultipleProcessesResult(ticketsErros, ticketsProcessados);

        return apiReturn;
    }

    private async ChangeTicketOwner(ticket: interfaces.ActivitiesCode, destinyUserId: number, ticketsProcessados: any[], ticketErrors: any[]) {
        try {
            const attObj = {
                HandledBy: destinyUserId
            }
            await this.SapServices.updateActivity(ticket.ClgCode, attObj);
            ticketsProcessados.push({ ClgCode: ticket.ClgCode });
        } catch (err: any) {
            ticketErrors.push({ ClgCode: ticket.ClgCode, error: err.message });
        }
    }

}
