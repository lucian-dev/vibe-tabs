const mix = require("laravel-mix");

mix.setPublicPath("dist");

mix.js("src/background/background.js", "dist/js").js("src/options/options.js", "dist/js").js("src/popup/popup.js", "dist/js").js("src/welcome/welcome.js", "dist/js");

mix.sass("src/styles/main.scss", "dist/css/main.css").options({ processCssUrls: false });
