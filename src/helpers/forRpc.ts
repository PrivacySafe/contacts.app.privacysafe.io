import { useAppStore } from '@/store/app.store'
import { makeServiceCaller } from '@/libs/ipc-service-caller'

type PassedDatum = web3n.rpc.PassedDatum;


export function jsonToDatum(json: any): PassedDatum {
  const utf8Encoder = new TextEncoder()
  const dataBytes = utf8Encoder.encode(JSON.stringify(json))
  return { bytes: dataBytes }
}

export function datumToJson<T>(data: PassedDatum): T {
  const utf8Decoder = new TextDecoder()
  const jsonStr = utf8Decoder.decode(data.bytes)
  return JSON.parse(jsonStr)
}

export async function getAppConfig (): Promise<void> {
  const appStore = useAppStore()
  let configSrvConnection: web3n.rpc.client.RPCConnection
  try {
    configSrvConnection = await w3n.otherAppsRPC!('launcher.app.privacysafe.io', 'AppConfigs')
    const configSrv = makeServiceCaller<AppConfigs>(configSrvConnection, ['getCurrentLanguage', 'getCurrentColorTheme']) as AppConfigs
    console.log('\nconfigSrv: ', configSrv)

    const lang = await configSrv.getCurrentLanguage()
    const { currentTheme, colors } = await configSrv.getCurrentColorTheme()

    appStore.setLang(lang)
    appStore.setColorTheme({ theme: currentTheme, colors })
  } catch (e) {
    console.error(e)
  } finally {
    await configSrvConnection!.close()
  }
}
