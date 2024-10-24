import { SapServices } from "../../services/SapServices";
import { DatabaseServices } from "../../services/DatabaseServices";
import { HttpError } from "../../Server";
import * as interfaces from '../../types/interfaces';
import * as helperFunctions from '../../utils/helperFunctions';

export class OpportunitiesController {
    private static instance: OpportunitiesController;

    private SapServices: SapServices;
    private DataBaseServices: DatabaseServices;


    constructor() {
        this.SapServices = SapServices.getInstance();
        this.DataBaseServices = DatabaseServices.getInstance();
    }


    public async ChangeOpportunitiesOwnerShip(originSlpCode: number, destinySlpCode: number) {
        const changedOpps: any = [];
        const errorOpps: any = [];

        const opps = await this.SapServices.getOpportunities(originSlpCode);
        if (opps.length === 0 ) {
            throw new HttpError(404, `No opportunities were found for SlpCode ${originSlpCode}`);
        }

        await Promise.all(opps.map((opp) => this.ChangeOpportunityOwner(opp.OpprId, destinySlpCode, changedOpps, errorOpps) ))

        const returnData = helperFunctions.handleMultipleProcessesResult(errorOpps, changedOpps)
        return returnData;
    }


    private async ChangeOpportunityOwner(OpprId: number, SlpCode: number, processedOpps: any[], errorOpps: any[]) {
        try {
            await this.SapServices.changeOpprOwner(OpprId, SlpCode);
            console.log(`Changed oppr ${OpprId} successfully`);
            processedOpps.push({OpprId})
        } catch(err: any) {
            console.log(`Error witj oppr ${OpprId}`)
            errorOpps.push({OpprId, error: err.message})
        }
    }


    public static getInstance(): OpportunitiesController {
        if (!OpportunitiesController.instance) {
            OpportunitiesController.instance = new OpportunitiesController();
        }
        return OpportunitiesController.instance;
    }

}