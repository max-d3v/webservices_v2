import { SapServices } from "../../services/SapServices";
import { HttpError, HttpErrorWithDetails } from "../../utils/errorHandler";
import * as helperFunctions from "../../utils/helperFunctions";
import * as interfaces from "../../types/interfaces";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";

export class ActivitiesController {
    private static instance: ActivitiesController;
    private sapServices: SapServices;
    private dataBaseServices: DatabaseServices;
    private LocalFiscalDataClass: LocalFiscalDataClass;

    constructor() {
        this.sapServices = SapServices.getInstance();
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
                    this.sapServices.deactivateTicket(ticket.ClgCode),
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
            tickets = await this.sapServices.getOpenTicketsFromVendor(parsedUserId);
        } else if (type == "OldTickets") {
            const date = new Date(new Date().getFullYear(), 9, 17); 
            tickets = await this.sapServices.getOpenTicketsFromBefore(date);
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

            const getTickets = await this.sapServices.getOpenTicketsFromVendor(parsedOriginUserId);
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

    private async ChangeTicketOwner(ticket: interfaces.ActivitiesCode, destinyUserId: number, ticketsProcessados: any[], ticketErrors: any[]) {
        try {
            const attObj = {
                HandledBy: destinyUserId
            }       
            await this.sapServices.updateActivity(ticket.ClgCode, attObj);
            ticketsProcessados.push({ ClgCode: ticket.ClgCode });
        } catch (err: any) {
            ticketErrors.push({ ClgCode: ticket.ClgCode, error: err.message });
        }
    }

}
