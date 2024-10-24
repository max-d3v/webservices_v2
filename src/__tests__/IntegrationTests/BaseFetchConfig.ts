const url = process.env.HOST + ":" + process.env.PORT + "/webservices";
const token = process.env.TOKEN;

interface baseConfig {
    method: string;
    maxBodyLength: number;
    url: string;
    data: any;
    headers: {
        Authorization: string;
    };
    validateStatus: (status: number) => boolean;
}

export const baseConfig: baseConfig = {
    method: '',
    maxBodyLength: Infinity,
    url: url,
    data: undefined,
    headers: {
        'Authorization': 'Bearer ' + token
    },
    validateStatus: function (status: number) {
        return true; 
    },
};
