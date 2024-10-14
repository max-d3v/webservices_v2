import axios from "axios";
import https from 'https';
import { baseConfig } from "./BaseFetchConfig";
import { Server } from '../../Server';
import { HttpError } from "../../Server";
import * as interfaces from '../../types/interfaces';

describe("Company endpoints test suite", () => {

    let server: Server;

    beforeAll(async () => {
        server = new Server();
        await server.start();
    })

    afterAll(async () => {
        await server.stop();
    })



    describe("GET /company/:cnpj", () => {
        test("Should get company data from local fiscal data", async () => {
            const config = { ...baseConfig };
            config.method = 'get';
            config.url += "/company/02741897000300"

            const response = await axios.request(config)

            expect(response.status).toBe(200)
            expect(response.data).toMatchObject<interfaces.CnpjJaData>({} as interfaces.CnpjJaData);
        });

        test("Should return 400 for invalid CNPJ", async () => {
            const config = { ...baseConfig };
            config.method = 'get';
            config.url += "/company/123"

            const response = await axios.request(config)

            expect(response.status).toBe(400)
        });

        test("Should return 404 when company not found", async () => {
            const config = { ...baseConfig };
            config.method = 'get';
            config.url += "/company/88464844000134" //Random cnpj

            const response = await axios.request(config)

            expect(response.status).toBe(404)
        })
    })

});
