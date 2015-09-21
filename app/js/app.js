'use strict';

var filters = angular.module('filters', []);
filters.filter('html', ['$sce', function ($sce) { 
    return function (text) {
        return $sce.trustAsHtml(text);
    };
}]);

filters.filter('htmlStrip', [ function() {
    return function (text) {
        return text ? String(text).replace(/<[^>]+>/gm, '') : '';
    };
}]);


var services = angular.module('services', []);
services.service('rssFeedService', RssFeedService);

RssFeedService.$inject = ['$http', '$q'];

function RssFeedService($http, $q) {
    var self = this;
    var apiRootPath = '/api' ;

    self.observerCallbacks = [];

    self.rssFeeds = [];

    self.requestCanceler = null;

    RssFeedService.prototype.registerObserverCallback = 
        function (eventCallbackObj) {
            self.observerCallbacks.push(eventCallbackObj);
        };

    RssFeedService.prototype.notifyChange = function (eventStr, args) {
        angular.forEach(self.observerCallbacks, function(eventCallbackObj){
            if(eventCallbackObj.event === eventStr)
                eventCallbackObj.fn(args);
        });
    };

    RssFeedService.prototype.getRssfeedById = function (id) {
        for(var i = 0; i <= self.rssFeeds.length - 1; i++) {
            if (self.rssFeeds[i].id === id)
                return self.rssFeeds[i];
        }
        return null;
    };

    RssFeedService.prototype.getRssfeedData = function (id) {

        var rssFeed = self.getRssfeedById(id);
        
        if(rssFeed === null) {
            return;
        }

        self.cancelLastRequest();

        if (rssFeed !== undefined && rssFeed !== null &&
            rssFeed.articles !== undefined && rssFeed.articles !== null) {
                self.notifyChange('rssFeedDataChanged', rssFeed.articles);
                return;
        }

        self.requestCanceler = $q.defer();

        $http.get(
            apiRootPath + '/rssfeeds/' + id + '/getdata', 
            {'timeout': self.requestCanceler}
        ).then(
            function (httpResponse){
                rssFeed.articles = angular.fromJson(httpResponse.data);
                self.requestCanceler = null;
                self.notifyChange('rssFeedDataChanged', rssFeed.articles);

            },
            function (httpResponse){
                self.requestCanceler = null;
                rssFeed.articles = null;
            }
        );
    };

    RssFeedService.prototype.getRssfeeds = function () {
        self.rssFeeds = []; 
        $http.get(
            apiRootPath + '/rssfeeds?filter=' +
            encodeURIComponent('{"order": "title ASC"}')
        ).then( 
            function (httpResponse) {
                self.rssFeeds = angular.fromJson(httpResponse.data);
                self.notifyChange('rssFeedsChanged');
            },
            function (httpResponse) {
                self.rssFeeds = null;
                
            }
        );
    };

    RssFeedService.prototype.cancelLastRequest = function () {
        if (self.requestCanceler !== null) {
            self.requestCanceler.resolve();
            self.requestCanceler = null;
        }
    };
}

var controllers = angular.module('controllers', []);
controllers.controller('MainController', MainController);

MainController.$inject = ['$window', 'rssFeedService'];

function MainController($window, rssFeedService) {
    var self = this;
    $window.document.title = self.title = 'ngFeeds';
    rssFeedService.getRssfeeds();

    //Controller callbacks
    MainController.prototype.rssFeedsChanged = function () {
        self.rssFeeds = rssFeedService.rssFeeds;
    };

    MainController.prototype.rssFeedDataChanged = function (rssData) {
        self.currentFeedItems = rssData;
        self.isLoading = false;
    };

    //Register callbacks
    rssFeedService.registerObserverCallback({
        event: 'rssFeedsChanged',
        fn : angular.bind(self,self.rssFeedsChanged)
    });

    rssFeedService.registerObserverCallback({
        event: 'rssFeedDataChanged',
        fn : angular.bind(self,self.rssFeedDataChanged)
    });

    //Controller methods used in template
    MainController.prototype.rssFeedSelected = function () {
        self.isLoading = true;
        rssFeedService.getRssfeedData(self.currentRssfeedSelection);
    };
}

var newsFeedApp = 
    angular.module(
        'newsFeedApp',
        ['services', 'controllers', 'filters', 'ngMaterial']
    ).config(function ($mdThemingProvider){
        $mdThemingProvider.definePalette('blue-sky', {'50':'#f0fbfd','100':'#d1f3fa','200':'#b3ecf7','300':'#99e5f4','400':'#7fdef2','500':'#66d8ef','600':'#59bdd1','700':'#4da2b3','800':'#408795','900':'#336c78','A100':'#d1f3fa','A200':'#b3ecf7','A400':'#7fdef2','A700':'#4da2b3'});
        $mdThemingProvider.definePalette('green-matrix', {'50':'#f0f9ea','100':'#d3eec0','200':'#b5e397','300':'#9cd974','400':'#84cf51','500':'#6bc62e','600':'#5ead28','700':'#509523','800':'#437c1d','900':'#366317','A100':'#d3eec0','A200':'#b5e397','A400':'#84cf51','A700':'#509523'});
        $mdThemingProvider.definePalette('gold-warn', {'50':'#ffffe6','100':'#feffb3','200':'#fdff80','300':'#fcff55','400':'#fcff2a','500':'#fbff00','600':'#dcdf00','700':'#bcbf00','800':'#9d9f00','900':'#7e8000','A100':'#feffb3','A200':'#fdff80','A400':'#fcff2a','A700':'#bcbf00'});
        $mdThemingProvider.definePalette('black-void', {'50':'#e6e6e6','100':'#b3b3b3','200':'#808080','300':'#555555','400':'#2a2a2a','500':'#000000','600':'#000000','700':'#000000','800':'#000000','900':'#000000','A100':'#b3b3b3','A200':'#808080','A400':'#2a2a2a','A700':'#000000'});
        $mdThemingProvider.theme('default')
            .primaryPalette('blue-sky', {'default' : '500'})
            .accentPalette('green-matrix', {'default' : '500'})
            .warnPalette('gold-warn', {'default' : '500'})
            .backgroundPalette('black-void', {'default' : '500'})
            .dark();
    });