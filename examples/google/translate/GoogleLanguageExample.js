const { Reshuffle } = require('reshuffle')
const { GoogleTranslateConnector } = require('reshuffle-google-connectors')
const app = new Reshuffle()

async function main() {
  const googleTranslateConfig = { credentials: credentials, location: 'global' }
  const connector = new GoogleTranslateConnector(app, googleTranslateConfig)

  // Translate a string
  const result = await connector.translateText('The text I want translate', 'en', 'fr')
  console.log('Text translation:', result)

  // Translate array of strings
  const results = await connector.translateTexts(
    ['The text I want translate', 'Additional text'],
    'en',
    'fr',
  )
  console.log(JSON.stringify(results))
  for (const translation of results.translations) {
    console.log(translation.translatedText)
  }

  // Translate using the sdk
  const [sdkResult] = await connector.sdk().translateText({
    parent: '<PATH_TO_YOUR_PROJECT_LOCATION>',
    contents: ['The text I want translate', 'Additional text'],
    mimeType: 'text/plain',
    sourceLanguageCode: 'en',
    targetLanguageCode: 'fr',
  })
  // PATH_TO_YOUR_PROJECT_LOCATION - Location to make a call. Must refer to a caller's project.
  // Format: projects/{project-number-or-id}/locations/{location-id}
  // e.g.'projects/project-01/locations/global'

  for (const translation of sdkResult.translations) {
    console.log(`Translation: ${translation.translatedText}`)
  }
}

main()
