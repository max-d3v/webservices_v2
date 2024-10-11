const url = process.env.HOST + ":" + process.env.PORT + "/webservices";
const token = process.env.TOKEN;


export const baseConfig = {
    method: '',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Authorization': 'Bearer ' + token
    },
    validateStatus: function (status: number) {
        return true; 
    },
};
