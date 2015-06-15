const AMAZON_URL =
    "http://ecs.amazonaws.com/onca/xml?Service=AWSECommerceService&" +
    "Version=2013-08-01&" +
    "AssociateTag=foo&";
const OMDB_URL =
    "http://www.omdbapi.com/?y=&plot=short&r=json&callback=receivedItemDescription&t=";
const CORS_PROXY = "http://localhost:1337/";

function browse() {
    var url = AMAZON_URL + "Operation=ItemSearch&SearchIndex=Video&BrowseNode=2625373011&" +
        "ResponseGroup=Medium&Sort=salesrank";
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
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var asin = item.getElementsByTagName("ASIN")[0].textContent;
        var title = item.getElementsByTagName("Title")[0].textContent;
        var image = item.getElementsByTagName("LargeImage")[0];
        var imageURL = image.getElementsByTagName("URL")[0].textContent;

        var li = document.createElement("li");
        li.setAttribute("data-asin", asin);
        li.setAttribute("data-title", title);
        li.addEventListener("click", itemClicked, false);
        li.setAttribute("title", title);
        li.style.backgroundImage = "url(" + imageURL + ")";

        document.getElementById('results').appendChild(li);
    }
}

function itemClicked(event) {
    var asin = event.currentTarget.getAttribute("data-asin");
    var amazonURL = AMAZON_URL + "Operation=ItemLookup&ItemId=" + asin +
        "&ResponseGroup=Medium";
    amazonURL = invokeRequest(amazonURL);
    amazonURL = amazonURL.replace(/^http:\/\//, CORS_PROXY);

    var request = new XMLHttpRequest;
    request.onload = receivedItemData;
    request.open('get', amazonURL, true);
    request.send();

    var title = event.currentTarget.getAttribute("data-title");
    title = title.match(/\w+/g).map(function(s) {
        return s.toLowerCase();
    }).filter(function(s) {
        return s != "hd";
    }).join("%20");
    var omdbURL = OMDB_URL + title;
    var script = document.createElement("script");
    script.setAttribute("src", omdbURL);
    document.body.appendChild(script);
}

function receivedItemData() {
    var parser = new DOMParser;
    var responseDocument = parser.parseFromString(this.responseText, "text/xml");
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

    replaceText("title", title);
    replaceText("genre", genre);
    replaceText("date", date);
    replaceText("actors", actors.join(", "));
    replaceText("price", price);
}

function receivedItemDescription(description) {
    // FIXME(pcwalton): This is racy.
    replaceText("description", description.Plot);
}

function replaceText(nodeId, text) {
    var node = document.getElementById(nodeId);
    while (node.lastChild != null)
        node.removeChild(node.lastChild);
    node.appendChild(document.createTextNode(text));
}

function main() {
    browse();
}

main();

