const AMAZON_URL =
    "http://ecs.amazonaws.com/onca/xml?Service=AWSECommerceService&" +
    "Version=2013-08-01&" +
    "AssociateTag=foo&";
const OMDB_URL = "http://www.omdbapi.com/?y=&plot=short&r=json&";
const CORS_PROXY = "http://localhost:1337/";
const MAX_ITEMS = 100;
const HIGHLIGHT_WIDTH = 6;

// Cached copies of data.
var items = {};
var descriptions = {};
var itemsLoading = false;
var itemsLoaded = 0;

function main() {
    setUpScrollHandler();
    loadNewItems();
}

function setUpScrollHandler() {
    window.addEventListener("scroll", scrolled, false);
}

function placeholderIsInView() {
    var placeholder = document.getElementById('placeholder');
    var scrollBottom = window.scrollY + window.innerHeight;
    var element = placeholder;

    var placeholderTop = 0;
    while (element != null) {
        placeholderTop += element.offsetTop;
        element = element.offsetParent;
    }
    return placeholderTop < scrollBottom;
}

function scrolled(event) {
    if (!itemsLoading && placeholderIsInView())
        loadNewItems();
}

function loadNewItems() {
    if (itemsLoading)
        return;
    itemsLoading = true;

    var url = AMAZON_URL + "Operation=ItemSearch&SearchIndex=Video&BrowseNode=2625373011&" +
        "ResponseGroup=Medium&Sort=salesrank&ItemPage=" + (((itemsLoaded / 10) | 0) + 1);
    url = invokeRequest(url);
    url = url.replace(/^http:\/\//, CORS_PROXY);

    var request = new XMLHttpRequest;
    request.onload = receivedBrowseData;
    request.open('get', url, true);
    request.send();
}

function receivedBrowseData() {
    var parser = new DOMParser;
    var responseDocument = parser.parseFromString(this.responseText, "text/xml");
    var items = responseDocument.getElementsByTagName("Item");
    var results = document.getElementById('results');
    var placeholder = document.getElementById('placeholder');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var asin = item.getElementsByTagName("ASIN")[0].textContent;
        var title = item.getElementsByTagName("Title")[0].textContent;
        var image = item.getElementsByTagName("LargeImage")[0];
        var imageURL = image.getElementsByTagName("URL")[0].textContent;
        var highResImage = item.getElementsByTagName("HiResImage")[0];
        var highResImageURL = highResImage.getElementsByTagName("URL")[0].textContent;

        console.log(this.responseText);

        var li = document.createElement("li");
        li.setAttribute("data-asin", asin);
        li.setAttribute("data-title", title);
        li.setAttribute("data-high-res-image", highResImageURL);
        li.addEventListener("mouseover", itemMousedOver, false);
        li.addEventListener("click", itemClicked, false);
        li.setAttribute("title", title);
        li.style.backgroundImage = "url(" + imageURL + ")";

        results.insertBefore(li, placeholder);
    }

    itemsLoaded += items.length;
    itemsLoading = false;
    if (placeholderIsInView())
        loadNewItems();
}

function itemMousedOver(event) {
    var target = event.currentTarget;

    var asin = target.getAttribute("data-asin");
    document.getElementById('drawer').setAttribute("data-asin", asin);

    var poster = document.getElementById('details-poster');
    poster.style.backgroundImage = "url(" + target.getAttribute("data-high-res-image") + ")";

    // Request or fill in details.
    if (!(asin in items)) {
        var amazonURL = AMAZON_URL + "Operation=ItemLookup&ItemId=" + asin +
            "&ResponseGroup=Medium";
        amazonURL = invokeRequest(amazonURL);
        amazonURL = amazonURL.replace(/^http:\/\//, CORS_PROXY);

        var request = new XMLHttpRequest;
        request.onload = receivedItemData;
        request.open('get', amazonURL, true);
        request.send();
    } else {
        populateDrawerWithDetails();
    }

    // Request or fill in the description.
    if (!(asin in descriptions)) {
        var title = event.currentTarget.getAttribute("data-title");
        title = title.match(/\w+/g).map(function(s) {
            return s.toLowerCase();
        }).filter(function(s) {
            return s != "hd";
        }).join("%20");

        var callback = function(description) {
            receivedItemDescription(asin, description);
        };
        var callbackName = "receivedItemDescriptionFor" + asin;
        window[callbackName] = callback;

        var omdbURL = OMDB_URL + "&callback=" + callbackName + "&t=" + title;
        var script = document.createElement("script");
        script.setAttribute("src", omdbURL);
        document.body.appendChild(script);
    } else {
        populateDrawerWithDescription();
    }
}

function itemClicked(event) {
    var target = event.currentTarget;

    document.getElementById('details-pane').classList.remove('collapsed');
    document.getElementById('drawer').classList.add('collapsed');
    document.getElementById('results').classList.add('small');
}

function receivedItemData() {
    var parser = new DOMParser;
    var responseDocument = parser.parseFromString(this.responseText, "text/xml");
    var asin = responseDocument.getElementsByTagName("ItemId")[0].textContent;
    items[asin] = responseDocument;
    populateDrawerWithDetails();
}

function populateDrawerWithDetails() {
    var asin = document.getElementById('drawer').getAttribute("data-asin");
    if (!(asin in items))
        return;

    var responseDocument = items[asin];
    var attributes = responseDocument.getElementsByTagName("ItemAttributes")[0];
    var title = attributes.getElementsByTagName("Title")[0].textContent;

    var rating = attributes.getElementsByTagName("AudienceRating")[0].textContent;
    rating = rating.match(/[A-Z0-9-]+/)[0];

    var runningTime = attributes.getElementsByTagName("RunningTime")[0].textContent;
    var hours = runningTime >= 60 ? "" + Math.floor(runningTime / 60) + "h " : "";
    runningTime = hours + (runningTime % 60) + "m";

    var date = attributes.getElementsByTagName("ReleaseDate")[0].textContent;
    date = date.match(/\d+/)[0];

    var price = responseDocument.getElementsByTagName("OfferSummary")[0]
                                .getElementsByTagName("LowestNewPrice")[0]
                                .getElementsByTagName("FormattedPrice")[0]
                                .textContent;

    replaceText("drawer-title", title);
    replaceText("drawer-date", date);
    replaceText("drawer-rating", rating);
    replaceText("drawer-running-time", runningTime);
    replaceText("details-title", title);
    replaceText("details-date", date);
    replaceText("details-rating", rating);
    replaceText("details-running-time", runningTime);
    replaceText("details-price", price);
}

function receivedItemDescription(asin, description) {
    descriptions[asin] = description;
    populateDrawerWithDescription();
}

function populateDrawerWithDescription() {
    var asin = document.getElementById('drawer').getAttribute("data-asin");
    if (!(asin in descriptions))
        return;

    replaceText("drawer-description", descriptions[asin].Plot);
    replaceText("details-description", descriptions[asin].Plot);

    var starRatings = document.getElementsByClassName("star-rating");
    for (var i = 0; i < starRatings.length; i++) {
        var starRating = starRatings[i];
        for (var j = 0; j < 5; j++)
            starRating.classList.remove("star-rating-" + j);
        starRating.classList.add("star-rating-" + Math.floor(descriptions[asin].imdbRating / 2.0));
    }
}

function replaceText(nodeId, text) {
    var node = document.getElementById(nodeId);
    while (node.lastChild != null)
        node.removeChild(node.lastChild);
    node.appendChild(document.createTextNode(text));
}

main();

