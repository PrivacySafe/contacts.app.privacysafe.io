export * from './images'
export * from './app-info'
export * from './contacts'

export const chatApp = Object.freeze({
	domain: 'chat.app.privacysafe.io',
	openCmd: 'open-chat-with'
})

export interface OpenChatCmdArg {
	peerAddress: string;
}
