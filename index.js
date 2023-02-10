import fetch from 'node-fetch';
import { appendFileSync } from 'fs';

const API_KEY = process.env.MB_API_KEY;

const CONVERSASTIONS_API_URL = 'https://conversations.messagebird.com/v1'
const LIMIT = 20;

if (!API_KEY) {
  throw new Error('MB_API_KEY is missing in env variables')
}


let messageBodies = []

const pushMessageBody = text => {

  const withoutNewline = text.replaceAll('\n', '');

  messageBodies.push(withoutNewline);
}


async function getMessages(conversationId, offset = 0) {
  const resp = await fetch(`${CONVERSASTIONS_API_URL}/conversations/${conversationId}/messages?limit=${LIMIT}&${offset ? offset : ''}`, {
    headers: {
      Authorization: `AccessKey ${API_KEY}`
    }
  });
  const json = await resp.json();

  console.log('getting messages for conversation', conversationId, offset);
  for (let message of json.items) {
    if (message.type === 'text') {
      pushMessageBody(message.content.text);
    }

    // todo
    if (message.type === 'email') {
      pushMessageBody(message.content.text);
    }
  }

  const hasNextPage = (offset + json.count) < json.totalCount;
  if (hasNextPage) {
    await getMessages(conversationId, offset + LIMIT);
  }
}

async function getConversations(offset = 0) {
  const resp = await fetch(`${CONVERSASTIONS_API_URL}/conversations?limit=${LIMIT}&${offset}`, {
    headers: {
      Authorization: `AccessKey ${API_KEY}`
    }
  })

  const json = await resp.json();

  console.log('converastions', { totalCount: json.totalCount, offset: json.offset, limit: json.limit })

  const messages = json.items.map(item => item.id).map(id => getMessages(id));

  await Promise.all(
    messages
  );

  console.log('conversations', json.offset + json.count, json.totalCount);

  const hasNextPage = (offset + json.count) < json.totalCount;
  if (hasNextPage) {
    await getConversations(conversationId, offset + LIMIT);
  }
}


await getConversations();


const csv = messageBodies.join('\n');

console.log(messageBodies, csv);
try {
  appendFileSync("./result.csv", csv);
} catch (err) {
  console.error(err);
}
