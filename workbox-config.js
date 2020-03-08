module.exports = {
  "globDirectory": "build/",
  "globPatterns": [
    "**/*.css",
    "index.html",
    "js/**/*.js",
    "images/**/*.jpg",
    "images/**/*.png",
    "pages/offline.html",
    "pages/404.html",
    'manifest.json'
  ],
  "swDest": "build/sw.js",
  "swSrc": "src/sw.js",
  "globIgnores": [
    "../workbox-config.js"
  ]
};
