import axios from "axios";
import https from 'https';

describe("Company endpoints test suite", () => {

    const url = process.env.HOST + ":" + process.env.PORT;
    const token = process.env.TOKEN;

    const httpAgent = new https.Agent({
        rejectUnauthorized: false
    });

    const baseConfig = {
        method: '',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'Authorization': token
        },
        httpsAgent: httpAgent
    };

    const baseCompanyData = {
        "message": "Success",
        "data": {
            "updated": "2024-09-14T00:00:00.000Z",
            "taxId": "02741897000300",
            "company": {
                "id": 2741897,
                "name": "CLINICA DA SAUDE DO APARELHO DIGESTIVO DE BLUMENAU LTDA",
                "equity": 64100,
                "nature": {
                    "id": 2062,
                    "text": "Sociedade Empresária Limitada"
                },
                "size": {
                    "id": 5,
                    "acronym": "DEMAIS",
                    "text": "Demais"
                },
                "members": [
                    {
                        "since": "2020-10-23",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "048f5e20-4e80-4f33-9ca3-bf90600537c4",
                            "name": "Maira Silva de Godoy",
                            "type": "NATURAL",
                            "taxId": "***027109**",
                            "age": "41-50"
                        }
                    },
                    {
                        "since": "2023-07-28",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "0b28340f-2adb-42cb-b7ab-54a2abb6d0e5",
                            "name": "Karine Gusso Ponce",
                            "type": "NATURAL",
                            "taxId": "***094529**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2003-10-29",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "192555b6-7f1b-417d-9ccf-8db1f7facb70",
                            "name": "Daniel Fernando Soares e Silva",
                            "type": "NATURAL",
                            "taxId": "***640409**",
                            "age": "41-50"
                        }
                    },
                    {
                        "since": "2023-07-28",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "2dbbd466-6913-4851-a855-b8f239309426",
                            "name": "Arnaldo Paulino Dantas Neto",
                            "type": "NATURAL",
                            "taxId": "***163794**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2023-02-24",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "3fd95be1-a691-4059-ad3f-748049f70dfa",
                            "name": "Debora Creuz",
                            "type": "NATURAL",
                            "taxId": "***453839**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2020-10-23",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "4db8150c-044e-4041-a350-2cdf511a734d",
                            "name": "Bruno Walter Wascheck",
                            "type": "NATURAL",
                            "taxId": "***100161**",
                            "age": "61-70"
                        }
                    },
                    {
                        "since": "2020-10-23",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "53a2ac80-75ac-4542-a89c-9c564f2abf90",
                            "name": "Marcelo Augusto Scheidemantel Nogara",
                            "type": "NATURAL",
                            "taxId": "***370329**",
                            "age": "51-60"
                        }
                    },
                    {
                        "since": "2022-08-02",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "582bd999-ceec-4911-ab52-83091c070f99",
                            "name": "Luiza Dadan Perini",
                            "type": "NATURAL",
                            "taxId": "***421969**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2020-10-23",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "5bea4262-b4ae-4f5f-a24d-58db0910c31e",
                            "name": "Camila Pilati Drago",
                            "type": "NATURAL",
                            "taxId": "***570550**",
                            "age": "41-50"
                        }
                    },
                    {
                        "since": "1998-03-10",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "71e26529-451b-47be-807f-7c6db20e001c",
                            "name": "Edson Pedro da Silva",
                            "type": "NATURAL",
                            "taxId": "***241599**",
                            "age": "71-80"
                        }
                    },
                    {
                        "since": "2024-07-20",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "83347dd9-8374-4b2b-a3ec-cbd564f93dba",
                            "name": "Talita Cristine Vieira Moreira",
                            "type": "NATURAL",
                            "taxId": "***124163**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2023-07-28",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "ac72839a-621e-4fe7-9768-e2b85d229d1a",
                            "name": "Amanda Vivan Taniguchi Mandelli",
                            "type": "NATURAL",
                            "taxId": "***248579**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2024-02-27",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "beff9aac-ea03-4465-b7dd-eda2b1f0cceb",
                            "name": "Paula Benedetti de Camargo",
                            "type": "NATURAL",
                            "taxId": "***619300**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "2013-10-18",
                        "role": {
                            "id": 49,
                            "text": "Sócio-Administrador"
                        },
                        "person": {
                            "id": "ed9e2693-6c44-4df1-ba15-1c634f4347f5",
                            "name": "Pedro Eduardo Soares e Silva",
                            "type": "NATURAL",
                            "taxId": "***887059**",
                            "age": "41-50"
                        }
                    },
                    {
                        "since": "2023-07-28",
                        "role": {
                            "id": 22,
                            "text": "Sócio"
                        },
                        "person": {
                            "id": "f4d7f959-f0e4-43ec-93d4-f64b1278f8de",
                            "name": "Camila de Souza Justini",
                            "type": "NATURAL",
                            "taxId": "***076719**",
                            "age": "31-40"
                        }
                    },
                    {
                        "since": "1998-03-10",
                        "role": {
                            "id": 49,
                            "text": "Sócio-Administrador"
                        },
                        "person": {
                            "id": "f5061e84-be45-4b07-ba79-bad217fc6fe0",
                            "name": "Juliano Coelho Ludvig",
                            "type": "NATURAL",
                            "taxId": "***413009**",
                            "age": "51-60"
                        }
                    }
                ],
                "simei": {
                    "optant": false,
                    "since": null
                },
                "simples": {
                    "optant": false,
                    "since": null
                }
            },
            "alias": "Esadi",
            "founded": "2022-08-02",
            "head": false,
            "statusDate": "2024-02-27",
            "status": {
                "id": 8,
                "text": "Baixada"
            },
            "reason": {
                "id": 1,
                "text": "Extinção Por Encerramento Liquidação Voluntária"
            },
            "address": {
                "municipality": 4202404,
                "street": "Rua Marechal Floriano Peixoto",
                "number": "300",
                "details": "Sala 304 305 306 e 307",
                "district": "Centro",
                "city": "Blumenau",
                "state": "SC",
                "zip": "89010906",
                "country": {
                    "id": 76,
                    "name": "Brasil"
                }
            },
            "phones": [
                {
                    "area": "47",
                    "number": "32220432"
                }
            ],
            "emails": [
                {
                    "address": "recepcao2@esadi.com.br",
                    "domain": "esadi.com.br"
                }
            ],
            "mainActivity": {
                "id": 8610101,
                "text": "Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências"
            },
            "sideActivities": [
                {
                    "id": 8630503,
                    "text": "Atividade médica ambulatorial restrita a consultas"
                },
                {
                    "id": 8630599,
                    "text": "Atividades de atenção ambulatorial não especificadas anteriormente"
                },
                {
                    "id": 8640209,
                    "text": "Serviços de diagnóstico por métodos ópticos - endoscopia e outros exames análogos"
                }
            ],
            "registrations": []
        }
    }
    
    test("Should get company data from SAP", async () => {
        baseConfig.method = 'get';
        baseConfig.url = url + "/company/02741897000300"
        

        const response = await axios.request(baseConfig)

        expect(response.status).toBe(200)
        expect(response.data).toBeValidCnpjData
        

    });

});
