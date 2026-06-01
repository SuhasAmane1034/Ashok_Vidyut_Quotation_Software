/** Suppress missing source-map warnings from html2pdf.js (broken upstream maps). */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.forEach((rule) => {
        if (!rule.oneOf) return;
        rule.oneOf.forEach((inner) => {
          const loader = inner.loader;
          if (typeof loader !== 'string' || !loader.includes('source-map-loader')) return;
          const prev = inner.exclude
            ? Array.isArray(inner.exclude)
              ? inner.exclude
              : [inner.exclude]
            : [];
          inner.exclude = [...prev, /html2pdf\.js/];
        });
      });

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) =>
          typeof warning.message === 'string' &&
          warning.message.includes('Failed to parse source map') &&
          warning.message.includes('html2pdf'),
      ];

      return webpackConfig;
    },
  },
};
