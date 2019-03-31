# Event Bus based frontend architecture
The frontend is now powered by an EventEmitter2-based event bus. Ideally, any cross-component logic should be handled by the event bus.

The Event Bus can be accessed using `window.site.events`. There is also a secondary Event Bus, called the Command Bus, which can be accessed using `window.site.commands`. See below for more information on commands.

## event namespaces and wildcards
* all events should be namespaced. namespaces are done with ':'.
* platform-wide events should be named global:eventName, and there are only a handful of these.
* all other events should be namespaced under something logical for the component, for example the 'me:' namespace for the src/__root__/js/me.js file.
* EventEmitter supports wildcards in two forms: `*` and `**`, with the difference being that `**` crosses `:`-boundaries. For example:
```javascript
  events.on('foo:bar:baz', handler1);
  events.on('foo:*:baz', handler2);
  events.on('foo:*:*:baz', handler3)
  events.on('foo:**:baz', handler4);

  events.emit('foo:bar:baz'); // fires handler1, handler2, and handler4
  events.emit('foo:bing:baz'); // fires handler2 and handler4
  events.emit('foo:bing:bar:baz'); // fires handler3 and handler4
  events.emit('foo:bing:bang:bar:baz'); // fires only handler4
```

## event types:
There are two types of events supported by the event bus -- *regular events* and *commands*. Regular events may or may not be listened to by any component. Command events should always be listened to by **EXACTLY ONE** component.

* regular events:
  * subscribed with `site.events.on(eventName, func)`
  * published with `site.events.emit(eventName, [args...])`
  * events are not guaranteed to be listened to.
* command events:
  * define a command with `site.commands.define(commandName, func)`
  * run a command with `site.commands.run(commandName, [...args...])`
  * attempting to define multiple commands with the same name **will throw an error**.
  * attempting to run a command that has not been defined **will throw an error** rather than failing silently.
  * technically under the hood this is just a second EventEmitter2 instance located in **site.events._commands**, but this should be considered an implementation detail only and should not be relied on.

## The DomReady Flow:
Here's what happens on page init, and how it'll affect you while writing components:
* platform.js fires **global:ready**
* other components hook into **global:ready**
  * me.js initializes based on cookies/localStorage before this, but waits until **global:ready** to fire the **global:logged-in** or **global:logged-out** events
* **NO COMPONENT SHOULD EVER HOOK INTO DOM-READY IN ANY OTHER WAY**.

# Event List

## Global events:
* **global:init**
  * fired at the end of any page's javascript code, before the domready call.
* **global:ready**
  * fired on domready (unless `global:init` hasn't been run yet as of domready, in which case `global:ready` is fired immediately after `global:init`)
* **global:logged-in** (arguments: isInitial, userObject)
  * fired on page init if user is authed in localStorage
  * after firing, call the api event 'api:me:fetch' to refresh user data
  * `isInitial` flag is true during the intial pageload when jwts are first read, false afterwards
* **global:logged-out** (arguments: isInitial)
  * fired on page init if user is not authed in localStorage
  * `isInitial` flag is true during the intial pageload when jwts are first read, false afterwards
* **global:logged-out-auto** (arguments: isInitial)
  * fired on page init if user is not authed in localStorage
  * `isInitial` flag is true during the intial pageload when jwts are first read, false afterwards  
* **global:visibility:changed** (arguments: an object with keys .isVisible and .visibility)
* **global:visibility:set-visible** (arguments: an object with keys .isVisible and .visibility)
* **global:visibility:set-hidden** (arguments: an object with keys .isVisible and .visibility)
  * These events are fired when the page visibility changed, as determined by the html5 visibility API.
  * the values passed are exactly the values stored in `site.isVisible` and `site.visibility`. For the most part,
    `.isVisible` is equal to `!document.hidden` and site.visibility is the value in `document.visibility` (except
    that on a browser which doesn't support the HTML5 visibility api these values have a sane default of
    `.isVisible=true` and `.visibility=visible`)

## Modal events
* **modal:did-open**
* **modal:did-open:some_modal_id**
  * both of these events are fired whenever a modal is opened. In the second form, the string some_modal_id will be the 'id' parameter of the modal's html element (with leading 'modal-' removed).
* **modal:did-close**
* **modal:did-close:some_modal_id**
  * both of these events are fired whenever a modal is closed. In the second form, the string some_modal_id will be the 'id' parameter of the modal's html element (with leading 'modal-' removed).

## Logged-in user events:
* **me:details** (arguments: userDetailsObject)
  * fired whenever user is updated, either through system processes that call site.me.setUser(), the 'api:me:fetch' api event being dispatched by anyone, or the **me:fetch-details** command event being called (ie `events.run('me:fetch-details')`)
  * will be fired with an extra argument containing the user details
  * this can be fired with 'null' as the argument, particularly in the case of log-out

## Outclick events:
* **outclick:success**
  * runs on a successful outclick as started by outclick:start

## Share events:
* **share**: (arguments: shareType, params, url, title)
  * fired when anything is shared over any service
  * `shareType` will be `email`, `facebook`, `twitter`, or `google`
  * `params` are the utm_ parameters that were appended to this share url
  * `url` is the full url shared including utm_ parameters embedded
  * `title` is the full title of the shared page, and is also used as the share title for the service (when appropriate/applicable)
* **share:facebook**: (arguments: shareType, params, url, title)
* **share:twitter**: (arguments: shareType, params, url, title)
* **share:google**: (arguments: shareType, params, url, title)
* **share:email**: (arguments: shareType, params, url, title)
  * these are fired alongside the global share event.

## UI Events:
* **ui-preferences:updated** (arguments: o_userPrefs)
  * fired when the user updates her preferences. The new set of preferences is sent.qqqq

# Command list
## Navigation Commands:
* **navigate:url**: (arguments: s_urlPath)
  * navigates to a url relative to /, OR a fully-qualified absolute URL (if the url starts with http/https)
  * all of the other navigate:* events eventually call navigate:url.
* **navigate:home**: no arguments
  * navigates to home page at /*CURRENT_REGION*/*CURRENT_LANGUAGE*/
* **navigate:api**: (arguments: s_url)
  * navigates to [apiHost]/[s_url]. Should be called rarely, but for example [apiHost]/auth/(facebook|google|twitter) is used during the login process.
  * if you need to trigger a third party auth yourself, use **navigate:third-party-auth** instead
* **navigate:page**: (arguments: s_url)
  * navigates to /*CURRENT_REGION*/*CURRENT_LANGUAGE*/[s_url]
* **navigate:category**: (arguments: s_category)
  * navigates to /*CURRENT_REGION*/*CURRENT_LANGUAGE*/c/[s_category]
* **navigate:region**: (arguments: s_region)
  * navigates to the current page but with selected region instead
* **navigate:language**: (arguments: s_lang)
  * navigates to the current page but with selected language instead
* **navigate:oauth**: (arguments: s_action, s_provider, returnUrl)
  * initiates a third party OAuth session using one of our supported OAuth providers
  * s_action should be one of `signup`, `login`, or `link`
  * s_provider should be one of `facebook`, `twitter`, or `google`
  * returnUrl is the url that the user will be redirected to after authentication. This is stored in localStorage and passed to **navigate:url** after a successful auth
* **navigate:remote**: (arguments: s_url)
  * navigate to a url on a different server. Using this is preferred over window.location=s_url (even though this is currently what's done under the hood)


## Modal Commands:
* **modal:close**: no arguments
  * closes all modals
* **modal:open**: (arguments: selector)
  * opens the modal with the given css selector
* **modal:open:iframe**: (arguments: selector, src)
  * opens the modal with the given css selector. element must be an iframe.
  * if `src` is supplied, sets the .src attribute of the iframe before opening it
* **modal:open:template**: (arguments: tplName, data)
  * opens the modal in `src/__root__/views/templates/modals/{{tplName}}.hbs`, feeding it `data` to initialize
  * modal contents will automatically be wrapped in `<div class='modal' id='modal-{{tplName}}'></div>`
* **modal:open:sign-in**: (arguments: o_urlParams)
  * special case for opening the sign-in modal. Adds specified urlParams to the sign-in query string.

## "me" Component Commands (commands for the currently logged-in user):
* **me:fetch-details**: no arguments
  * causes user object to refresh its details by running the 'api:me:fetch' api call.
  * example: `site.commands.run('me:fetch-details');`
* **me:logout**: no arguments
  * logs the user out and clears their tokens
  * example: `site.commands.run('me:logout');`
* **me:drop-high-tokens**: no arguments
  * clears the user's high token and admin token, but leaves low token intact
  * example: `site.commands.run('me:drop-high-tokens');`
* **me:login**: arguments: (o_tokens)
  * processes user login. this should be called from any login-type components.
  * o_tokens should contain keys 'low', 'high', 'admin' (if necessary) as returned by auth calls
  * example: `site.commands.run('me:login', {high:foo, low:bar, admin:baz});`
* **me:update**: arguments: (o_updates)
  * this is an interface to api:me:update. however, unlike api:me:update, this one also updates the current defined site.me user with the values in o_obj.
* **me:refresh-tokens**: no arguments
  * force login to store/refresh/check-ttl-of tokens. shouldn't be much of a reason to call this directly.

# Api Events:
* For a full list of available api events, look in `src/__root__/js/system/api.js`; all api calls for the platform are defined there.
* All defined api calls have the following regular events defined, where **[name]** is the name of the api call as passed to `site.api.register` in `api.js`. These events are handy if you want to respond to **every** time a particular api is called:
  * **api:response:[name]** : called on 'success' of api call (jquery's .success)
    * `site.events.on('api:response:me:fetch', function() { ... });`
  * **api:error:[name]** : called on 'error' of api call (jquery's .error)
    * `site.events.on('api:error:me:fetch', function(){ ... });`
  * **api:complete:[name]** : called on 'complete' of api call (jquery's .complete)
    * `site.events.on('api:complete:me:fetch', function(){ ... });`
* In addition, a Command Event is created. Whatever you pass as argument 2 will be treated as the first argument to the api call:
  * command name: **api:[name]**
    * `site.commands.run('api:me:fetch', {});` runs the api call that has been defined as: `site.api.register('me:fetch', ...)`
    * jQuery's `$.ajax()` chaining still works here, so `events.run('api:me:fetch').success(function(user) { ... })` would work as expected if you don't want to globally register a handler for that api call's success and would rather just deal with the result of a single api call inline.
* The `events.emit()` and `commands.define()` calls for these api events are automatically defined/handled by the `site.api._register(name, httpMethod, apiPath)` command, so registering an api handler using this will set up all of your events nicely.
