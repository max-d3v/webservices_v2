import axios from "axios";
import https from 'https';
import { baseConfig } from "./baseConfig";
import { Server } from '../../Server';
import { HttpError } from "../../Server";

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
        test("Should get company data from SAP", async () => {
            const config = { ...baseConfig };
            config.method = 'get';
            config.url += "/company/02741897000300"

            const response = await axios.request(config)

            expect(response.status).toBe(200)
            expect(response.data).toBeValidCnpjData
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
            config.url += "/company/54.065.771/0001-96" //Generated ramdom CNPJ

            const response = await axios.request(config)

            expect(response.status).toBe(404)
        })
    })

});
