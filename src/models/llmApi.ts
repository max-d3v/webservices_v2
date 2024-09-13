import axios from "axios";

export const llm_api = async (endpoint: string, data: any) => {
    const requestConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${process.env.LLM_HOST}/${endpoint}`,
        headers: {  
            'Content-Type': 'application/json', 
        },
        data,
    }
    

    return await axios(requestConfig);
}

