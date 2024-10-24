import { baseConfig } from "./BaseFetchConfig";
import { Server } from '../../Server';
import { BusinessPartnersController } from "../../Controllers/SapControllers/BusinessPartnersController";
import { SapServices } from "../../services/SapServices";
import axios from "axios";
import * as interfaces from '../../types/interfaces';
//
const ActiveClientsReturnedMock = jest.spyOn(BusinessPartnersController.prototype, "getFiscalClientData")
const getOpenTicketsFromVendorMock = jest.spyOn(SapServices.prototype, "getOpenTicketsFromVendor");

describe("Integration tests", () => {

    let sut: Server;

    beforeAll(async () => {
        sut = new Server();
        await sut.start();
    })

    afterAll(async () => {
        await sut.stop();
    })


    describe("Local company fiscal data", () => {
        it("Should get company data from local fiscal data", async () => {
            const config = { ...baseConfig };
            config.method = 'get';
            config.url += "/company/02741897000300"

            const response = await axios.request(config)

            expect(response.status).toBe(200)
            expect(response.data).toMatchObject<interfaces.CnpjJaData>({} as interfaces.CnpjJaData);
        });
    })



    describe("Business Partners", () => {
        const config = { ...baseConfig };
        config.url += "/BusinessPartners"; 
        describe("Fiscal Data", () => {
            config.url += "/FiscalData";

            describe("PATCH /Client/:CardCode", () => {
                config.method = "patch";
                let clientUrl = config.url + "/Client";
                const validClient = "C023482";
                const validClientBaseData = {
                    CardCode: 'C023482',
                    CardName: 'Stampa Pet & Food Ltda',
                    State1: 'PR',
                    TaxId0: '11.330.623/0001-49',
                    Free_Text: '- Informações da Atualiação cadastral geral, realizada dia 2024-10-07:   Atividade principal: Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios - Informações da Atualiação cadastral geral, realizada dia 2024-10-10:   Atividade principal: Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios - Informações da Atualiação cadastral geral, realizada dia 2024-10-10:   Atividade principal: Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios - Informações da Atualiação cadastral geral, realizada dia 2024-10-10:   Atividade principal: Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios',
                    Balance: 10416.96,
                    Adresses: ['', 'Faturamento']
                }

                test("Should update fiscal data with correct data", async () => {
                    ActiveClientsReturnedMock.mockResolvedValueOnce([
                        validClientBaseData
                    ]);

                    clientUrl += "/" + validClient;

                    const response = await axios.request({ ...config, url: clientUrl });
                    expect(response.status).toBe(200);
                }, 20000);
            })


            describe("PATCH /Unprocessed", () => {
                let unprocessedUrl = config.url + "/Unprocessed";

                const validQueryReturn: interfaces.RelevantClientData[] = [
                    {
                        CardCode: 'C000052',
                        CardName: 'Comfio Cia Catarinense De Fiacao',
                        State1: 'SC',
                        TaxId0: '82.607.847/0001-01',
                        Free_Text: '- Informações da Atualiação cadastral geral, realizada dia 2024-10-11:   Atividade principal: Preparação e fiação de fibras de algodão  Motivo da baixa: Incorporação',
                        Balance: 0,
                        Adresses: ['', 'Faturamento']
                    },
                    {
                        CardCode: 'C001664',
                        CardName: 'Comercio De Combustiveis Pastorello Sa',
                        State1: 'SC',
                        TaxId0: '79.964.177/0006-72',
                        Free_Text: '- Informações da Atualiação cadastral geral, realizada dia 2024-10-11:   Atividade principal: Comércio varejista de combustíveis para veículos automotores  Motivo da baixa: Extinção Por Encerramento Liquidação Voluntária',
                        Balance: 0,
                        Adresses: ['', 'Faturamento']
                    },
                    {
                        CardCode: 'C004178',
                        CardName: 'Pandebono Alimentos Ltda Me',
                        State1: 'SC',
                        TaxId0: '18.563.438/0001-43',
                        Free_Text: '- Informações da Atualiação cadastral geral, realizada dia 2024-10-11:   Atividade principal: Fabricação de produtos de panificação industrial  Motivo da baixa: Extinção Por Encerramento Liquidação Voluntária',
                        Balance: 0,
                        Adresses: ['', 'Faturamento']
                    }
                ]

                test("Valid clients that should finish with success", async () => {
                    ActiveClientsReturnedMock.mockResolvedValueOnce(validQueryReturn);

                    const response = await axios.request({ ...config, url: unprocessedUrl });

                    expect(response.status).toBe(200);
                }, 15000)

                test("One client that ends in error and others that finish with success", async () => {
                    const semiValidQueryReturn: interfaces.RelevantClientData[] = [
                        ...validQueryReturn,
                        {
                            CardCode: "C000000",
                            CardName: "Invalid Client",
                            TaxId0: "00.000.000/0000-00",
                            State1: "SC",
                            Balance: 0,
                            Adresses: [""],
                        }
                    ]

                    ActiveClientsReturnedMock.mockResolvedValueOnce(semiValidQueryReturn);

                    const response = await axios.request({ ...config, url: unprocessedUrl });

                    expect(response.status).toBe(206);
                }, 15000)

                test("All clients result in error", async () => {
                    const invalidQueryReturn: interfaces.RelevantClientData[] = [
                        {
                            CardCode: "C000000",
                            CardName: "Invalid Client",
                            TaxId0: "00.000.000/0000-00",
                            State1: "SC",
                            Balance: 0,
                            Adresses: [""],
                        }
                    ];

                    ActiveClientsReturnedMock.mockResolvedValueOnce(invalidQueryReturn);

                    const response = await axios.request({ ...config, url: unprocessedUrl });

                    expect(response.status).toBe(400);
                })
            })
        })
    })
});
