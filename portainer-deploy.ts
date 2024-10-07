import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

const agent = new https.Agent({
    rejectUnauthorized: false
});

//DEPLOY

class DeployPortainer {
    private portainerUrl: string | undefined;
    private dockerAuth: string | undefined;
    private Username: string | undefined;
    private Password: string | undefined;
    private Imagem: string | undefined;
    private NomeImagem: string | undefined;
    private ExposedPorts: string | undefined;

    private idContainer: string;
    private token: string;
    
    constructor() {
        //.
        dotenv.config({ path: '.env.deploy' });
        this.portainerUrl = process.env.PORTAINER_URL;
        this.dockerAuth = process.env.DOCKER_AUTH;
        this.Username = process.env.PORTAINER_USERNAME;
        this.Password = process.env.PORTAINER_PASSWORD;
        
        this.idContainer = "";
        this.token = "";
        
        this.Imagem = process.env.IMAGEM;
        this.NomeImagem = process.env.NOME_IMAGEM;
        this.ExposedPorts = process.env.PORTA;
    }

    executaGitOps = async () => {
        try {
            await this.validateAllEnvVars();
            await this.portainerLogin();
            await this.pararContainerPorImagem();
            await this.deletarContainerParados();
            await this.pullarImagemDockerHub();
            await this.criarContainer();
            await this.rodarContainer();
            await this.deletarImagensParadas();
        } catch (err: any) {
            console.error("Erro ao executar GitOps:", err.message);
            process.exit(1);
        }
    }

    validateAllEnvVars = async () => {
        if (!this.portainerUrl || !this.dockerAuth || !this.Username || !this.Password || !this.Imagem || !this.NomeImagem || !this.ExposedPorts) {
            throw new Error("Variáveis de ambiente não definidas corretamente");
        }
    }

    portainerLogin = async () => {
        try {
                    const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + '/auth',
            headers: {
                'Content-Type': 'application/json', 
            },
            data: {
                Username: this.Username,
                Password: this.Password
            },
            httpsAgent: agent
        }
        const response = await axios(config);
        const token = response.data.jwt;
        this.token = token;  
        } catch(err: any) {
            throw new Error("Erro ao fazer login no Portainer")
        }
    }

    pullarImagemDockerHub = async () => {
        try {
            const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + '/endpoints/2/docker/images/create?fromImage='+ this.Imagem +'',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.token}`,
                'X-Registry-Auth': this.dockerAuth
            },
            httpsAgent: agent
        }
        
            const response = await axios(config);
            console.log("Puxou a imagem do dockerhub com sucesso!")
        } catch(err) {
            throw new Error("Erro ao puxar a imagem do Docker Hub")
        }
    }
    

    pararContainerPorImagem = async () => {
        try {
            const listContainersConfig = {
                method: "get",
                url: this.portainerUrl + '/endpoints/2/docker/containers/json?all=true',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
                httpsAgent: agent
            };
            const response = await axios(listContainersConfig);
            const containers = response.data;
            
            const targetContainer = containers.find((container: any) => container.Image === this.Imagem);
            if (targetContainer) {
                const stopContainerConfig = {
                    method: "post",
                    url: this.portainerUrl + `/endpoints/2/docker/containers/${targetContainer.Id}/stop`,
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                    },
                    httpsAgent: agent
                };
                await axios(stopContainerConfig);
                console.log(`Container ${targetContainer.Id} parado com sucesso.`);
            } else {
                console.log("Nenhum container rodando com a imagem especificada.");
            }
        } catch (error) {
            console.error("Erro ao parar o container:", error);
        }
    }
    deletarContainerParados = async () => {
        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + '/endpoints/2/docker/containers/prune',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.token}`,
            },
            httpsAgent: agent
        }
        try {
            const response = await axios(config);
            console.log("Deletou containers parados com sucesso")
        } catch(err) {
            throw new Error("Erro ao deletar os containers parados")
        }
    }

    deletarImagensParadas = async () => {
        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + '/endpoints/2/docker/images/prune',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.token}`,
            },
            httpsAgent: agent 
        }
        try {
            const response = await axios(config);
            console.log("Deletou images parados com sucesso")
        } catch(err) {
            throw new Error("Erro ao deletar os images parados")
        }
    }

    criarContainer = async () => {
        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + '/endpoints/2/docker/containers/create',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.token}`,
            },
            data: {
                "name": this.NomeImagem,
                "Image": this.Imagem,
                "ExposedPorts": { "80/tcp": {} },
                "HostConfig": { 
                    "PortBindings": { "8122/tcp" : [{ "HostPort": this.ExposedPorts }] },
                    "Memory": 500000000,
                    "MemorySwap": 500000000
                },
                "Tty": true,
                "OpenStdin": true,
                "StdinOnce": false
            },
            httpsAgent: agent
        }
        try {
            const response = await axios(config);
            this.idContainer = response.data.Id;
            console.log("Criou o container com sucesso!")

        } catch(err) {
            throw new Error("Erro ao criar o container")
        }
    }


    rodarContainer = async () => {
        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: this.portainerUrl + `/endpoints/2/docker/containers/${this.idContainer}/start`,
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.token}`,
            },
            httpsAgent: agent
        }

        try {
            const response = await axios(config);
            console.log("Rodou o container com sucesso!");
        } catch(err) {
            throw new Error("Erro ao rodar o container");
        }
    }
}

const deploy = new DeployPortainer();
deploy.executaGitOps();