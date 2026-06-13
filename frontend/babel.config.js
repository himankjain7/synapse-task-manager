module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin must be listed last according to documentation
      'react-native-reanimated/plugin',
    ],
  };
};
