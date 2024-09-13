import {llm_api} from "../models/llmApi";

async function test() {
    const response = await llm_api('translate_to_pt', {
        text: 'Hello, how are you?',
    });
    console.log(JSON.parse(response.data).text);
}

test();