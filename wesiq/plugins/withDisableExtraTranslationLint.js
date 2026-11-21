const { withAppBuildGradle } = require("@expo/config-plugins")

module.exports = function withDisableExtraTranslationLint(config) {
  return withAppBuildGradle(config, (config) => {
    if(!config.modResults.contents.includes("disable 'ExtraTranslation'")) {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*\{/,
        `android {\n    lint {\n        disable 'ExtraTranslation'\n    }`
      )
    }
    
    return config
  })
}