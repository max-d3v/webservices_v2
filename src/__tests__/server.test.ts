import { startServer } from '../main';
import Server from '../server';

jest.mock('../server'); // Mock the Server class

describe("Server", () => {
    it("Should start the server without errors", async () => {
        const mockServer = {
            start: jest.fn().mockResolvedValue(undefined)
        };
        (Server as jest.Mock).mockImplementation(() => mockServer);

        await expect(startServer()).resolves.not.toThrow();
        expect(mockServer.start).toHaveBeenCalled();
    });
});