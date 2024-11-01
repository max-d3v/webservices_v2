import { BusinessPartnersController } from "../../Controllers/SapControllers/BusinessPartnersController";

//Classes to mock
import { SapServices } from "../../services/SapServices";
import { DatabaseServices } from "../../services/DatabaseServices";
import { LocalFiscalDataClass } from "../../models/LocalFiscalDataClass";
import { LocalFiscalDataServices } from "../../services/LocalFiscalDataServices";
//interfaces.RelevantClientData
// Mock para SapServices

const getAllActiveClientsRegistrationDataMock = jest.fn();
const getObjectByValueMock = jest.fn();

jest.mock("../../services/SapServices", () => {
      return {
        getAllActiveClientsRegistrationData: getAllActiveClientsRegistrationDataMock(),
        getInstance: jest.fn().mockReturnValue(new SapServices()) 
      };
  });
  
  // Mock para DatabaseServices
  jest.mock("../../services/DatabaseServices", () => {
    return jest.fn().mockImplementation(() => {
      return {
        getInstance: jest.fn().mockReturnValue(new DatabaseServices()) 
      };
    });
  });
  
  // Mock para LocalFiscalDataClass
  jest.mock("../../models/LocalFiscalDataClass", () => {
    return jest.fn().mockImplementation(() => {
      return {
        getInstance: jest.fn().mockReturnValue(new LocalFiscalDataClass()) 
      };
    });
  });

  jest.mock("../../services/LocalFiscalDataServices", () => {
    return jest.fn().mockImplementation(() => {
      return {
        getObjectByValue: getObjectByValueMock(),
        getInstance: jest.fn().mockReturnValue(new LocalFiscalDataServices()) 
      };
    });
  });


describe("Business Partner test suite", () => {

    let sut: BusinessPartnersController

    beforeEach(() => {
        sut = new BusinessPartnersController();
    })

    afterEach(() => {
        jest.clearAllMocks();
    })

    describe("Fiscal data updates", () => {
        let tipo = "All"; // Doesnt matter as long as i mock the client returns
        const dummyClient = {
            Adresses: ["Faturamento", ""],
            TaxId0: '0000000000',
            State1: "SC",
            CardCode: "C000001",
            CardName: "Dummy",
            Balance: 100,
            Free_Text: "Obs do cliente",        
        }
        const dummyFiscalData = {
            "taxId": "10947198000179",
            "company": {
                "simei": {
                    "optant": false,
                    "since": null
                },
                "simples": {
                    "optant": false,
                    "since": null
                }
            },
            "statusDate": "2021-10-07",
            "status": {
                "id": 8,
                "text": "Baixada"
            },
            "reason": {
                "id": 1,
                "text": "Extinção Por Encerramento Liquidação Voluntária"
            },
            "mainActivity": {
                "id": 5611203,
                "text": "Lanchonetes, casas de chá, de sucos e similares"
            },
            "registrations": [
                {
                    "state": "SC",
                    "number": "255890605",
                    "enabled": false,
                    "statusDate": "2021-05-27",
                    "status": {
                        "id": 1,
                        "text": "Sem restrição"
                    },
                    "type": {
                        "id": 1,
                        "text": "IE Normal"
                    }
                }
            ],
        }

        getAllActiveClientsRegistrationDataMock.mockResolvedValueOnce([dummyClient])

//Simples optant - U_TX_SN Sim-1 Nao-2
        //Ativo na inscrica estuadual 
            //U_TX_IndIEDest - Sim-1 Nao-9
            //TaxId1 nos adresses - numero se for, isento se não 
        //Ativo na receita - 
            //Valid - Sim-tYES Nao-tNO
            //Frozen - Sim-tNO Nao-tYES
        

        test("If no client is returned throw error", async () => {
            getAllActiveClientsRegistrationDataMock.mockResolvedValueOnce([]);
            await expect(sut.updateClientsRegistrationData(tipo)).rejects.toThrow();
        })
        

        test("Client not simples optant", async () => {
            const fiscalData = {...dummyFiscalData }
            fiscalData.company.simples.optant = false;

            getObjectByValueMock.mockResolvedValueOnce(fiscalData);


          let response;

            
            expect(response = await sut.updateClientsRegistrationData(tipo)).rejects.not.toThrow();

            expect(response[0]).toContain({U_TX_SN: 2})
        })
    })
})