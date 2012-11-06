#blackbeard.js - RUM for Mateys
    
             _,-._
            ; ___ :
        ,--' (. .) '--.__
      _;      |||        \
     '._,-----''';=.____,"
       /// < o>   |##|
       (o        \`--'
      ///\ >>>>  _\ <<<<
     --._>>>>>>>><<<<<<<<
     ___() >>>[||||]<<<<
     `--'>>>>>>>><<<<<<<
          >>>>>>><<<<<<
            >>>>><<<<<
             >>ctr<<

######What is blackbeard.js, and what the heck is RUM?
Blackbeard.js is a small javascript library you can add to your web site, similar to Google Analytics, which allows you to gather performance data from your end   users.  RUM is an acronym for Real User Measurement, which is what happens when blackbeard runs within an end user's browser.

######How does it work?
It's pretty simple, really:  You add a small snippet of javascript within the HEAD tags of a page, tell blackbeard where you want to send the end user data, and   sit back and watch the end user data flow in.  For more advanced use, there's an API based on the [W3C's User Timing specification][1] to instrument your page to    measure things like above-the-fold, AJAX requests, time-to-user-action, and others.

At its core, blackbeard relies heavily on the [W3C's Navigation Timing interface][2] for performance data.  This interface is widely supported in modern browsers like Chrome, Firefox, and Internet Explorer, as well as a few mobile devices.  For more information about Navigation Timing's browser support, consult [caniuse.com](http://caniuse.com/#feat=nav-timing). For browsers that don't support Navigation Timing, by default blackbeard collects data about when the DOMContentLoadedEvent fired, when the onload event fired.

Blackbeard also supports something called 'attributes'.  By default, blackbeard will report which URI was measured, the end user's platform, user agent, connection information (Android and Firefox browsers only), the page's visibility, whether or not the request was served via SPDY, and whether or not the device   supports touch (to help determine whether or not it was *really* a mobile browser, as opposed to a spoofed user agent).  Additionally, you can set your own        attributes, like whether or not the page was a conversion, the client's IP address, the server's IP address, or whatever else you need to identify an end user.

Once blackbeard has collected its data, it beacons the data back as query arguments to a tracking pixel.  Ideally, the URL for the tracking pixel will generate an HTTP 204 response rather than an actual 1x1 invisible gif, but if you don't have control over your webserver an invisible gif is fine.

######Sounds good, how do I implement blackbeard.js on my page?
It's as simple as adding something like the following at the top of the HEAD tag of your page:

`
    <script>BB_start = new Date().getTime();</script>
    <script src="js/blackbeard.js"></script>.
    <script>
      BB.config.beaconurl = "http://www.mysite.com/http204.gif";
      BB.init();
    </script>
`
Tutorials on advanced usage and analyzing the data will be coming soon!


[1]: http://www.w3.org/TR/user-timing/
[2]: http://www.w3.org/TR/navigation-timing/
