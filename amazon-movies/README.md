# Instructions

You'll need account keys for the [Amazon Product Advertising API](http://docs.aws.amazon.com/AWSECommerceService/latest/DG/Welcome.html). You can also bug pcwalton on IRC for his keys.

    $ git clone https://github.com/pcwalton/CORS-Proxy.git
    $ npm install ./CORS-Proxy
    $ node_modules/.bin/corsproxy

Put the following in `keys.js`:

    function getAccessKeyId() {
        return "MYAMAZONKEY";
    }
    function getSecretAccessKey() {
        return "MYAMAZONSECRETACCESSKEY";
    }

Open `index.html` in your Web browser.

# Credits

* Loading spinner: http://spiffygif.com/.

* API: Amazon.com, OMDB.

* JSSHA2 (needed for Amazon API): http://anmar.eu.org/projects/jssha2/.

* Star icons: http://icojoy.com

* Font: Google Fonts.
