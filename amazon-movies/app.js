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

        var li = document.createElement("li");
        li.setAttribute("data-asin", asin);
        li.setAttribute("data-title", title);
        li.addEventListener("mouseover", itemMousedOver, false);
        li.setAttribute("title", title);
        li.style.backgroundImage = "url(" + imageURL + ")";

        results.insertBefore(li, placeholder);
    }

    itemsLoaded += items.length;
    itemsLoading = false;
    if (placeholderIsInView())
        loadNewItems();
}

function moveHighlightToSurround(target) {
    var highlight = document.getElementById('results-highlight');

    var rect = target.getBoundingClientRect();
    highlight.style.left = (rect.left - HIGHLIGHT_WIDTH) + "px";
    highlight.style.top = (rect.top - HIGHLIGHT_WIDTH) + "px";
    highlight.style.width = (rect.width + HIGHLIGHT_WIDTH * 2) + "px";
    highlight.style.height = (rect.height + HIGHLIGHT_WIDTH * 2) + "px";
}

function itemMousedOver(event) {
    var target = event.currentTarget;
    moveHighlightToSurround(target);

    var asin = target.getAttribute("data-asin");
    document.getElementById('drawer').setAttribute("data-asin", asin);

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

function receivedItemData() {
    var parser = new DOMParser;
    //console.log(this.responseText);
    var responseDocument = parser.parseFromString(this.responseText, "text/xml");
    var asin = responseDocument.getElementsByTagName("ItemId")[0].textContent;
    console.log(asin);
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
    var genre = attributes.getElementsByTagName("Genre")[0].textContent;
    var date = attributes.getElementsByTagName("ReleaseDate")[0].textContent;

    var actorNodes = attributes.getElementsByTagName("Actor");
    var actors = [];
    for (var i = 0; i < actorNodes.length; i++) {
        actors.push(actorNodes[i].textContent);
    }

    var price = responseDocument.getElementsByTagName("OfferSummary")[0]
                                .getElementsByTagName("LowestNewPrice")[0]
                                .getElementsByTagName("FormattedPrice")[0]
                                .textContent;

    replaceText("drawer-title", title);
    replaceText("drawer-date", date);
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
}

function replaceText(nodeId, text) {
    var node = document.getElementById(nodeId);
    while (node.lastChild != null)
        node.removeChild(node.lastChild);
    node.appendChild(document.createTextNode(text));
}

main();

