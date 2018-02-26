# 💫 rilti.js 💫

a small flavorful and unapologetic library built for the modern web

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

##### currently in beta phase and potentially subject to breaking changes
Feel free to fork or raise issues. Constructive criticism is welcome

🐫 🐱 👶

## features
* elm-like ideas about architecture
* mostly declarative programming style
* node lifecycle hooks
* models with data binding, validation, events & sync/async accessors
* generate all your elements in js don't write clunky html
* program without concern for page load state
* components aka. custom-elements. No polyfill needed!
* vue-like directives aka custom attributes
* great dom manipulation functions
* functional composition & currying
* powerful notifier system (pub/sub with proxy magic)
* no classes, no this, no extra fuzz, functional positive
* no old javascript, we use modern features like Proxy
* a gziped rilti.min.js weighs > 6kb


To use rilti just download **/dist/rilti.min.js** and pop it in a script tag. **If you have any issues just tell me, I'm on it.**

## Example time!

### Click Counting Button

```js
const {dom: {button}, model} = rilti
const state = model({clicks: 0})

button({
  render: 'body',
  onclick: e => ++state.clicks
},
  'clicks: ', state.sync.clicks()
)
```
``state.sync.text.clicks`` <- Creates a Text node,     
with a value bound to the model's property ``clicks``.

```js
state.sync[prop] -> fn(=obj, key = prop) -> obj ? sync.text[prop]() : obj
```
so in this case
```js
state.sync.clicks() -> new Text(state.clicks)
```
but this is also possible
```js
state.sync(new Text(), 'textContent', 'clicks') -> new Text(state.clicks)
```
or
```js
state.sync.clicks(new Text(), 'textContent') -> new Text(state.clicks)
```
or this at a lower level
```js
const textNode = new Text(state.clicks)
state.on['set:clicks'](clicks => {
  textNode.textContent = clicks
})
```

you could also avoid ``.sync`` and go
```js
const {dom: {button}, model} = rilti
const state = model({clicks: 0})

const clicks = new Text(state.clicks)
state.on('set:clicks', count => {
  clicks.textContent = count
})

button({
  render: 'body',
  onclick: e => ++state.clicks
},
  'clicks: ', clicks
)
```

Either way the above will produce this html
```html
<button>clicks: 0</button>
<!-- Which is Technically -->
<button>
  "clicks:" <!-- text node -->
  "0" <!-- text node bound to state.clicks -->
</button>
```

#### Simple Persistent Markdown Scratch-Pad with ``.model``

```javascript
  const {dom: {article, body, textarea}, model} = rilti
  const m = model()

  const editor = m.sync.note(textarea())
// automagic data binding -^
  const display = article()

  body(editor, display)
// ^- render to document.body

  m.on('set:note', note => {
    localStorage.setItem('note', note)
    display.innerHTML = Markdown.parse(note)
// plugin your favorite md lib -^
  })

  m.note = localStorage.getItem('note') || 'Write something...'
```

### Two Button Counter

```js
const {dom: {button, div, h1}, model} = rilti
const state = model({count: 0})

div(
  {render: 'body'},// append to <body> on load
  h1(state.sync.text.count),// same as: state.sync.count()
  button({onclick: e => ++state.count}, '+'),
  button({onclick: e => --state.count}, '-')
)
```

### Declaratively Generate a Site Navbar
Stop writing html (yes JSX too)!
Just generate everything, it's so simple.

```js
const {compose, dom: {a, button, h1, header, nav, section}} = rilti

section(
  {$: 'body', id: 'navbar'},
// ^- $ is shorthand for render: 'Node/Selector'
  compose(header, h1)('My Wicked Website'),
  nav(
    ['Home','Blog','About','Contact'].map(
      name => a({class: 'nv-btn', href: '#/' + name.toLowerCase()}, name)
    ),
    a({
      class: 'nv-btn',
      css: {backgroundColor: 'white', color: 'dimgrey'},
      href: 'https://github.com/SaulDoesCode',
      target: '_blank'
    },
      'Github'
    )
  )
)
```
The above produces this html

```html
<section id="navbar">
  <header>
    <h1>My Wicked Website</h1>
  </header>
  <nav>
    <a class="nv-btn" href="#/home">
      <button>Home</button>
    </a>
    <a class="nv-btn" href="#/blog">
      <button>Blog</button>
    </a>
    <a class="nv-btn" href="#/about">
      <button>About</button>
    </a>
    <a class="nv-btn" href="#/contact">
      <button>Contact</button>
    </a>
    <a class="nv-btn" href="https://github.com/SaulDoesCode/rilti.js" target="_blank" style="background-color: dimgrey; color: white;">
      <button>Github</button>
    </a>
  </nav>
</section>
```

### API
| method | description  |
|--------|--------------|
| ``.dom["any-tag"](=options, ...children)`` | where the magic happens, define behavior for elements and see them come to life |
| ``.dom(StringOrNode, StringOrNode)`` | same as querySelector but returns a promise, it's essentially an async querySelector |
| ``.dom.query(string, StringOrNode)`` | improved alternative to ``document.querySelector``|
| ``.dom.queryAll(string, StringOrNode)`` | improved alternative to ``document.querySelectorAll``|
| ``.dom.queryEach(string, StringOrNode, func)`` | queries nodes returned by selector and iterates over them like ``.forEach`` would|
| ``.dom.html(string)`` | convert a string to an html document fragment |
| ``.on(target, type, listener, =options)`` | generates event listener |
| ``.once(target, type, listener, =options)`` | generates event listener that triggers only once |
| ``.curry(func, =argsLimit)`` | curries a function |
| ``.compose(...func)`` | compose functions, compose(fn1,fn2,fn3)(val) // -> result |
| ``.component(tag, {create, mount, destroy, attr, props, methods})`` | define custom elements, no polyfills needed |
| ``.each(iterable, func)`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``.extend(hostObj, obj, =safeMode)`` | extends host object with all props of other object, won't overwrite if safe is true |
| ``.extract(obj, path)``  | safely extract deeply nested values from objects e.g. ``extract({a: {b: [{c: 1}] } }, 'a.b.0.c') -> 1`` |
| ``.flatten(arraylike)`` | flattens multidimensional arraylike objects |
| ``.notifier(=obj)`` | extendable event system /pub sub pattern |
| ``.model(=obj)`` | Backbone like model with validation, please see [SuperModel.js](https://github.com/SaulDoesCode/SuperModel.js) it's the same |
| ``.render(node, StringOrNode, =connector)`` | renders nodes to a node of your choice, independent of ready state |
| ``.run(func)`` | asynchronously executes a given function when the DOM is loaded |
| ``.runAsync(func, ...args)`` | run a function asynchronously, and it doesn't even use setTimeout |
| ``.route(=hashString, func(hash))`` | detect and respond to location.hash changes |
| ``.isMounted(node, =parentNode)`` | determines whether or not the dom or other node contains a specific node |

##### rilti also exports a couple of useful Type-Testing functions
usage : ``rilti.isX( {any} ) // -> boolean``   
``isMounted,
isDef,
isNil,
isPromise,
isPrimitive,
isNull,
isFunc,
isStr,
isBool,
isNum,
isInt,
isIterator,
isRenderable,
isRegExp,
isObj,
isArr,
isArrlike,
isEmpty,
isEl,
isEqual,
isNode,
isNodeList,
isInput,
isMap,
isSet``

### DOM manipulation
rilti contains a ``domfn`` that contains several useful dom manipulation functions.
these fucntions will all return the node passed as the first argument unless specified
otherwise such as with has/get(this/that) type functions

```js
const {
  attatch,
  replace,
  css, // (node, stylePropery, val) || (node, { styleProp:'4em' }) set element.style properties
  Class, // (node, class, =state) add/remove or toggle classes
  hasClass, // (node, class) -> bool
  attr, // (node, attrNameOrObj, =value): attr(el, 'href', '/') or attr(el, 'href') -> '/'
  rmAttr, // (node, attrName) removes attributes
  hasAttr, // hasAttr(node, attrName) -> bool
  getAttr, // getAttr(node, attrName) -> string
  setAttr, // setAttr(node, attrName, value)
  attrToggle, // (node, attrName, state = !hasAttr, =val = getAttr(name) || '')
  emit, // (node, {type string/Event/CustomEvent}) dispatchEvents on node
  append, prepend, appendTo, prependTo, // (node, selectorOrNode)
  remove, // (node, =afterMS) // remove node or remove after timeout
  mutate // multitool i.e. (node, {class: 'card', css: {'--higlight-color': 'crimson'}}) -> options obj
} = rilti.domfn
```

## The Dao of Rilti

1. Nominalism Good | Obscuritanism, Idealism & Universalism Bad
   * Object Oriented anything is evil (no classes, no this)
   * Reserve identities only for things that would be otherwise obscure
   * Don't hide things let things be what they are
   * Data/Message passing before abstraction
   * Logic is also just data (with potential) so pass it around too
   * [Factory-Functions always](https://gist.github.com/mpj/17d8d73275bca303e8d2)
2. No HTML, Text & Elements are Objects too!
   * Selectors & Templates? I can't even...
   * Writing plain HTML adds extra complexity to javascript driven sites
   * Webpages should be alive, don't fear the DOM mess with it
3. MASA: Minimal API Surface Area.
   * Polymorphic functions/functions-as-class-like-objects
   * Infer data, good structure or Proxies instead of 12 parameter long functions
   * As Functional As Possible
   * Perspectivism vs Pragmatism, people won't always use an API the same way.
   * Leave some internals or lower level API features accessible for extendibility

A MASA example is ``rilti.listMap`` where the get/set methods are one function that is both the object and its interface.      
``listMap() -> {each, has, del, map} = fn(key, val)``    

Different strokes for different folks:
Also look at ``rilti.on`` which can be used like this ``on['any-event'](node, func, =options)``,
as well as like this ``on('any-event', node)(func, =options)``    
and also ``on(node, { click: e => {} }, =options)``.

#### examples of rilti used to build things in the wild
* [Rilti News - Progressive Web App](https://grimstack.io/news/)
* [clone and open ./examples/todo.html](https://github.com/SaulDoesCode/rilti.js/archive/master.zip)      
* [grimstack.io blog site](https://grimstack.io)     
* [grimstack.io/portfolio WIP Portfolio](https://grimstack.io/portfolio)     
* [rilti-todomvc](https://github.com/SaulDoesCode/rilti-todomvc)      

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js

#### future plans
* offer collection of useful optional plugins
* stabalize features and release
* expand with a UI library

#### Async Property accessors with ``.model().async`` and Async/Await

```js
  // view.js
  import Feed from 'news-feed.js'
  const NewsApp = rilti.model()

  NewsApp.async.latest.then(Feed.render)

  export default NewsApp

  // news.js
  import NewsApp from 'view.js'

  fetch('/news/latest').then(res => {
    // Promises are automagically handled
    NewsApp.latest = res.json()
  })
```

#### Create Elements with Any Tag
``dom['any-arbitrary-tag'](=options, ...children) -> Node/Element``

```javascript
dom['random-tag']({
  // render to dom using selectors or nodes
  render: '.main > header',
  // add attributes
  attr: {
    contenteditable: 'true',
  },
  // set classes
  class: 'card active',
  // or
  class: ['card', 'active']
  // or conditionally
  class: {
    card: true,
    active: false // active won't be added
  },
  // some styles?
  css: {
    boxShadow: '0 2px 6px rgba(0,0,0,.12)',
    '--highlight-color': 'crimson',
  // ^- oh yeah, css variables work too
  },
  // attach properties to the element
  props: {
    oldtxt: '',
    // create property get/set traps
    accesors: {
      txt: {
        get: el => el.innerText,
        set (el, val) { el.innerText = val.trim() }
      },
      // or as one function
      txt (el, val) {
        if (val === undefined) {
          return el.innerText
        }
        el.innerText = val.trim()
      }
    },
    // plain getter/setters work too
    get txt () { return this.innerText },
    set txt (val) { this.innerText = val.trim() }
  },
  methods: {
    // el will be pre-bound upon execution
    // think of it like self in python classes
    // or rust struct methods
    warn (el, ...args) {
      el.oldtxt = el.txt
      el.txt = 'Sure you want to remove random-tag?'
    },
    reset (el) { el.txt = el.oldtxt }
  },
  // listen for events
  on: {
    click (evt, {warn}) { warn() },
    mouseout (evt, {reset}) { reset() }
  },
  // if there's just one listener then use:
  // once_evt: fn instead of once: { evt: fn }
  once_dblclick (evt, el) { el.remove() },
  //  ^- underscore is optional
  // manage the element's lifecycle
  cycle: {
    create (el) { /*...*/ },
    mount (el) { /*...*/ },
    unmount (el) { /*...*/ },
    remount (el) { /*...*/ }
  }
},
  ...children
)
```

#### Directives / Custom Attributes

```javascript
// observe attributes with vue-like directives
rilti.directive('custom-attr', {
  init (element, value) { ... },
  update (element, value, oldValue) { ... },
  destroy (element, value) { ... }
})
// revoke a directive
rilti.directives.delete('custom-attr')
```

#### Web Components / Custom Elements, no polyfills needed
```js
const {domfn: {css, attr}, on, component} = rilti

component('tick-box', {
  create (el) {
    on.click(el, e => el.ticked = !el.ticked)
    css(el, {
      display: 'block',
      width: '20px',
      height: '20px',
      margin: '5px auto',
      cursor: 'pointer',
      border: `1px solid ${el.ticked ? 'white' : 'dimgrey'}`,
      backgroundColor: el.ticked ? 'dimgrey' : 'white'
    })
  },
  mount (el) {
    console.log('tick-box mounted to document')
  },
  unmount (el) {
   console.log('tick-box is no more :(')
  },
  attr: {
    ticked: {
      toggle (el, state) {
        !el.disabled && css(el, {
          backgroundColor: state ? 'dimgrey' : 'white',
          border: `1px solid ${state ? 'white' : 'dimgrey'}`
        })
      }
    },
    disabled: {
      toggle (el, state) {
        css(el, {
          cursor: state === 'true' ? 'not-allowed' : 'pointer'
        })
      }
    }
  }
})
```

#### see how fast rilti.js renders your elements

```html
<script src="/rilti/dist/rilti.min.js"></script>
<script>
  const testRiltiBlocking = (count = 10000) => {
    const {span} = rilti.dom
    const start = performance.now()
    while(count != 0) span({
      $: document.body,
      css: {
        background:'#fff',
        width:'110px',
        color: 'dimgrey',
        textAlign: 'center',
        height:'110px',
        margin:'5px',
        padding:'4px',
        float:'left',
        boxShadow:'0 1px 4px hsla(0,0%,0%,.3)'
      }
    },
      "damn daniel, back at it again with those white spans ",
      count--
    )

    console.log(`That took ${performance.now() - start}ms`)
  }
  testRiltiBlocking(); // -> this usually takes ~ 7800ms on my i5 machine

  const testRiltiChunked = (count = 10000) => {
    const {each, dom: {span}} = rilti
    const start = performance.now()
    // int loops are chunked making heavy loads less blocking
    each(count, i =>
      span({
        $: document.body,
        css: {
          background:'#fff',
          width:'110px',
          color: 'dimgrey',
          textAlign: 'center',
          height:'110px',
          margin:'5px',
          padding:'4px',
          float:'left',
          boxShadow:'0 1px 4px hsla(0,0%,0%,.3)'
        }
      },
        "damn daniel, back at it again with those white spans ",
        count--
      )
    )
    console.log(`The first chunk took ${performance.now() - start}ms`);
  }
  testRiltiChunked();
  // -> site useable even while rendering thousands of nodes
</script>
```

**listMap** is just a utility to manage a ``Map`` that contains ``Set``s
```javascript
  const lm = rilti.listMap()

  // set
  lm('key', 'value0')
  lm('key', 'value1')
  // get
  lm('key') // -> Set['value0', 'value1']
  // get the base map
  lm.map // -> Map{key: Set[...]}
  // has
  lm.has('key') // -> true
  lm.has('key', 'value2') // -> false
  // delete a value
  lm.del('key', 'value0')
  // or
  lm('key').delete('value0')

  // loop over contents
  lm.each('key', value => {
    console.log(value)
  })
  // value0
  // value1
  // ...
```

#### weight
* unminified:  > 28kb
* minified: > 11kb
* minified && compressed: > 6kb

#### license = MIT
