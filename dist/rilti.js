/*
* rilti a framework for all and none
* @author Saul van der Walt
* @license MIT
*/
/* global define */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports)
    : typeof define === 'function' && define.amd ? define(['exports'], factory)
      : (factory((global.rilti = {})))
}(this, function (exports) {
  'use strict'

  /* global Node NodeList Element SVGElement HTMLInputElement HTMLTextAreaElement */
  const ProxyNodeSymbol = Symbol('Proxy Node')
  const ComponentSymbol = Symbol('Component')

  const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true

  const isComponent = el => el !== undefined && el[ComponentSymbol] !== undefined

  const isArr = Array.isArray

  const isNil = o => o == null

  const isDef = o => o != null

  const isFunc = o => o instanceof Function

  const isBool = o => typeof o === 'boolean'

  const isObj = o => o != null && o.constructor === Object

  const isStr = o => typeof o === 'string'

  const isNum = o => typeof o === 'number' && !isNaN(o)

  const isInt = o => isNum(o) && o % 1 === 0

  const isArrlike = o => o != null && (isArr(o) || (
    !(o instanceof Function || o instanceof Node) &&
    o.length % 1 === 0
  ))

  const isNode = o => o instanceof Node

  const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && allare(o, isNode))

  const isPrimitive = o => {
    o = typeof o
    return o === 'string' || o === 'number' || o === 'boolean'
  }

  const isEl = o => o instanceof Element

  const isPromise = o => typeof o === 'object' && isFunc(o.then)

  const isRegExp = o => o instanceof RegExp

  const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)

  const isMounted = (child, parent = document) => isNodeList(child)
    ? Array.from(child).every(n => isMounted(n))
    : parent === child || !!(parent.compareDocumentPosition(child) & 16)

  const isSvg = o => {
    if (isProxyNode(o)) o = o()
    return o instanceof SVGElement
  }

  const isInput = (o, contentEditable) => {
    if (isProxyNode(o)) o = o()
    return o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement || (
      !!contentEditable &&
      o instanceof Element &&
      o.getAttribute('contenteditable') === 'true'
    )
  }

  const isRenderable = o => o instanceof Node ||
    isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable)

  /*
  * allare checks whether all items in an array are like a given param
  * it's similar to array.includes but allows functions
  */
  const allare = (arr, like) => {
    if (isArrlike(arr)) {
      const isfn = like instanceof Function
      for (let i = 0; i < arr.length; i++) {
        if (!(isfn ? like(arr[i]) : arr[i] === like)) {
          return false
        }
      }
      return true
    }
    return false
  }

  /*
  * compose a typical function composition functions
  * @ example compose(x => x + 1, x => x + 1)(1) === 3
  */
  const compose = (...fns) => fns.reduce((a, b) => (...args) => a(b(...args)))

  /*
  * curry a function
  * and optionally
  * set the arity or pre bound arguments
  */
  const curry = (fn, arity = fn.length, ...args) => arity <= args.length
    ? fn(...args) : curry.bind(null, fn, arity, ...args)

  const assign = Object.assign

  const clone = (host, empty) =>
    assign(empty ? Object.create(null) : {}, host)

  /*
  * flatten recursively spreads out nested arrays
  * to make the entire array one dimentional
  * @example flatten([1, [2, [3]], 4, [5]]) -> [1, 2, 3, 4, 5]
  * @example flatten(x) -> [x]
  */
  const flatten = (arr, result = [], encaptulate = true) => {
    if (encaptulate && !isArr(arr)) return [arr]
    for (let i = 0; i < arr.length; i++) {
      isArr(arr[i]) ? flatten(arr[i], result) : result.push(arr[i])
    }
    return result
  }

  /*
  * runAsync runs a function asynchronously
  */
  exports.runAsync = (fn, ...args) => window.requestIdleCallback(fn.bind(undefined, ...args))

  if (!window.requestIdleCallback) {
    exports.runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)
  }

  /*
  * run runs a function on DOMContentLoaded or asynchronously
  * if document.body is present and loaded
  */
  const run = function () {
    if (document.body || document.readyState === 'complete') {
      exports.runAsync.apply(undefined, arguments)
    } else {
      window.addEventListener('DOMContentLoaded',
        e => exports.runAsync.apply(undefined, arguments),
        {once: true}
      )
    }
  }

  /*
  *
  * DOM Query Selector Functions
  *
  */
  const query = (selector, host = document) => isNode(selector) ? selector : query(host).querySelector(selector)

  const queryAsync = (selector, host) => new Promise((resolve, reject) => {
    const find = () => {
      const result = query(selector, host)
      if (result == null) {
        reject(new Error("queryAsync: couldn't find " + selector))
      } else {
        resolve(result)
      }
    }
    document.body ? find() : run(find)
  })

  /*
  *  queryAll(selector String|Node, host = document String|Node)
  *  it returns an array of elements matching a selector,
  *  a nicer querySelectorAll essentially.
  */
  const queryAll = (selector, host = document) => Array.from(query(host).querySelectorAll(selector))

  const queryEach = (selector, fn, host = document) => {
    if (!isFunc(fn)) [fn, host] = [host, document]
    return each(queryAll(selector, host), fn)
  }

  /*
  * each iterates over arrays, objects, integers,
  * and anything implementing .forEach
  */
  const each = (iterable, fn) => {
    if (isDef(iterable)) {
      if (isObj(iterable)) {
        for (const key in iterable) {
          fn(iterable[key], key, iterable)
        }
      } else if (iterable.length) {
        const len = iterable.length
        let i = 0
        while (i !== len) fn(iterable[i], i++, iterable)
      } else if (iterable.forEach) {
        iterable.forEach(fn)
      } else if (isInt(iterable)) {
        let i = 0
        while (i < iterable) fn(i++, iterable)
      }
    }
    return iterable
  }

  /*
  * infinify takes a function that has a string (like an event type or key)
  * and returns a proxy which binds the key of any get operation
  * as that initial string argument enabling a very natural feeling API
  * @scope infinify(func) -> Proxy<func>
  * @example const emit = infinify(emitFN); emit.anyEvent(details)
  */
  const infinify = (fn, reflect) => new Proxy(fn, {
    get: reflect === true
      ? (fn, key) => key in fn ? Reflect.get(fn, key) : fn.bind(undefined, key)
      : (fn, key) => fn.bind(undefined, key)
  })

  /*
  * mutateSet is an abstraction over Set and WeakSet
  * it combines all basic Set ops into a single function
  */
  const mutateSet = set => (n, state) =>
    set[state == null ? 'has' : state ? 'add' : 'delete'](n)

  const copyprop = (host, obj, key) => {
    Object.defineProperty(host, key, Object.getOwnPropertyDescriptor(obj, key))
    return host
  }

  /*
  * merge(host Object|Array, target Object|Array)
  * merge objects together deeply.
  * it copies prop descriptions instead of raw values.
  */
  const merge = (host, target) => {
    if (isArr(host) && isArr(target)) {
      for (const val of target) if (!host.includes(val)) host.push(val)
    } else if (merge.able(host) && merge.able(target)) {
      for (const key in target) {
        if (key in host) {
          const old = host[key]
          const val = target[key]
          if (merge.able(old) && merge.able(val)) {
            merge(old, val)
          } else if (val != null) {
            copyprop(host, target, key)
          }
        } else {
          copyprop(host, target, key)
        }
      }
    }
    return host
  }

  merge.able = o => isArr(o) ||
    (o != null && typeof o === 'object' && !isFunc(o.then))

  /* global Node NodeList */

  const listen = (once, target, type, fn, options = false) => {
    if (isStr(target)) target = queryAll(target)
    if ((isArr(target) || target instanceof NodeList) && target.length === 1) {
      target = target[0]
    }

    if (isArr(target) ? !target.length : !target.addEventListener) {
      throw new Error('nil/empty event target(s)')
    }

    let typeobj = isObj(type)
    if (type == null || !(typeobj || isStr(type))) {
      throw new TypeError('cannot listen to nil or invalid event type')
    }

    if (isArr(target)) {
      for (let i = 0; i < target.length; i++) {
        target[i] = listen(once, target[i], typeobj ? clone(type) : type, fn, options)
      }
      target.off = () => {
        for (const h of target) h()
        return target
      }
      target.on = mode => {
        for (const h of target) h.on(mode)
        return target
      }
      return target
    }

    if (typeobj) {
      for (const name in type) {
        type[name] = listen(once, target, name, type[name], options)
      }
      return type
    }

    if (target instanceof Node && !options.proxy) target = $(target)

    function wrapper () {
      fn.call(this, ...arguments, target)
      if (off.once) off()
    }

    const on = mode => {
      if (mode != null && mode !== off.once) off.once = !!mode
      target.addEventListener(type, wrapper, options)
      off.ison = true
      return off
    }

    const off = assign(() => {
      target.removeEventListener(type, wrapper)
      off.ison = false
      return off
    }, {target, on, once})
    off.off = off

    return on()
  }

  const infinifyListen = {
    get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
  }

  const on = new Proxy(listen.bind(null, false), infinifyListen)
  const once = new Proxy(listen.bind(null, true), infinifyListen)
  const EventManager = curry(listen, 3)

  /* global Node Text */

  const html = (input, host) => {
    if (input instanceof Function) input = input(host)
    if (isNum(input)) input = String(input)
    if (typeof input === 'string') {
      return Array.from(
        document.createRange().createContextualFragment(input).childNodes
      )
    } else if (input instanceof Node) {
      return input
    } else if (isArr(input)) {
      return input.map(i => html(i))
    }
    throw new Error('.html: unrenderable input')
  }

  const frag = inner => inner != null
    ? html(inner) : document.createDocumentFragment()

  const assimilate = Object.assign(
    (el, {props, methods}, noProps) => {
      if (!noProps && props) assimilate.props(el, props)
      if (methods) assimilate.methods(el, methods)
    },
    {
      props (el, props) {
        const proxied = $(el)
        for (const prop in props) {
          let val = props[prop]
          if (prop in el) {
            el[prop] = val
          } else if (prop === 'accessors') {
            for (const key in val) {
              const {set = val[key], get = val[key]} = val[key]
              const accessors = {}
              if (set instanceof Function) {
                accessors.set = set.bind(el, proxied)
              }
              if (get instanceof Function) {
                accessors.get = get.bind(el, proxied)
              }
              Object.defineProperty(el, key, accessors)
            }
          } else if (val instanceof Function && !isProxyNode(val)) {
            el[prop] = val.call(el, proxied)
          } else {
            copyprop(el, props, prop)
          }
        }
      },
      methods (el, methods) {
        const proxied = $(el)
        for (const name in methods) {
          Object.defineProperty(el, name, {value: methods[name].bind(el, proxied)})
        }
      }
    }
  )

  // classes.push(...className.replace(/_/g, '-').split('.'))

  const tagify = str => {
    const upperChars = str.match(tagify.regexp)
    if (!upperChars) return str
    for (let i = 0, n = upperChars.length; i < n; i++) {
      str = str.replace(new RegExp(upperChars[i]), '-' + upperChars[i].toLowerCase())
    }
    return str[0] === '-' ? str.slice(1) : str
  }
  tagify.regexp = /([A-Z])/g

  const infinifyDOM = (gen, tag) => (tag = tagify(tag)) && tag in gen
    ? Reflect.get(gen, tag)
    : (gen[tag] = new Proxy(gen.bind(null, tag), {
      get (fn, classes) {
        classes = classes.replace(/_/g, '-').split('.')
        return new Proxy(function () {
          const el = fn.apply(null, arguments)
          el.classList.add(...classes)
          return el
        }, {
          get (_, anotherClass, proxy) {
            classes.push(...anotherClass.replace(/_/g, '-').split('.'))
            return proxy
          }
        })
      }
    }))

  const body = (...args) =>
    attach(document.body || 'body', 'appendChild', ...args)

  const text = (options, txt = '') => isPrimitive(options)
    ? dom(new Text(options)) : dom(new Text(txt), options)

  const reserved = ['$', 'id', 'render', 'children', 'html', 'class', 'className']
  const ns = 'http://www.w3.org/2000/svg'
  const svgEL = (tag, opts, ...children) => {
    const el = document.createElementNS(ns, tag)
    if (isObj(opts)) {
      for (const key in opts) {
        if (isPrimitive(opts[key]) && !reserved.includes(key) && !(key in domfn)) {
          el.setAttribute(key, opts[key])
          delete opts[key]
        }
      }
    }
    return dom(el, opts, ...children)
  }
  const svg = new Proxy(svgEL.bind(null, 'svg'), {
    get: (_, tag) => infinifyDOM(svgEL, tag)
  })

  const dom = new Proxy(Object.assign((tag, opts, ...children) => {
    if (tag[0] === '$') {
      tag = tag.slice(1)
      var pure = true
    }
    const el = typeof tag === 'string' ? document.createElement(tag) : tag

    const iscomponent = components.has(el.tagName)
    if (iscomponent) var componentHandled

    let proxied
    if (!isObj(opts)) {
      if (!pure) proxied = $(el)
    } else {
      var {cycle} = opts
      if (!pure) pure = opts.pure

      if (!pure) {
        proxied = $(el)
        if (isObj(opts.state)) {
          opts.state = (proxied.state = opts.state)
        }
      }

      assimilate(el, opts, iscomponent)

      let val
      for (const key in opts) {
        if ((val = opts[key]) == null) continue

        if (key[0] === 'o' && key[1] === 'n') {
          const isOnce = key[2] === 'c' && key[3] === 'e'
          const i = isOnce ? 4 : 2
          const mode = key.substr(0, i)
          let type = key.substr(i)
          const evtfn = EventManager(isOnce)
          const args = isArr(val) ? val : [val]
          if (!opts[mode]) opts[mode] = {}
          opts[mode][type] = type.length
            ? evtfn(el, type, ...args) : evtfn(el, ...args)
        } else if (key === 'state') {
          continue
        } else if (key in el) {
          if (el[key] instanceof Function) {
            isArr(val) ? el[key].apply(el, val) : el[key](val)
          } else {
            el[key] = opts[key]
          }
        } else if (key in domfn) {
          val = isArr(val) ? domfn[key](el, ...val) : domfn[key](el, val)
          if (val !== el) opts[key] = val
        }
      }

      if (cycle) {
        const {mount, create, remount, unmount} = cycle
        if (create) once.create(el, create.bind(el, proxied || el))
        if (mount) once.mount(el, mount.bind(el, proxied || el))
        if (unmount) cycle.unmount = on.unmount(el, unmount.bind(el, proxied || el))
        if (remount) cycle.remount = on.remount(el, remount.bind(el, proxied || el))
      }

      if (iscomponent) {
        updateComponent(el, null, null, opts.props)
        componentHandled = true
      }

      if (proxied && opts.binds) {
        for (const key in opts.binds) {
          proxied.state.bind(key, opts.binds[key])
        }
      }

      const host = opts.$ || opts.render
      if (host) attach(host, 'appendChild', el)
      else if (opts.renderAfter) attach(opts.renderAfter, 'after', el)
      else if (opts.renderBefore) attach(opts.renderBefore, 'before', el)
    }

    if (el.nodeType !== 3 /* el != Text */) {
      if (isProxyNode(opts) && (!proxied || opts !== proxied)) {
        children.unshift(opts(proxied || el))
      } else if (opts instanceof Function) {
        const result = opts.call(el, proxied || el)
        opts = result !== el && result !== proxied ? result : undefined
      }

      if (isRenderable(opts)) children.unshift(opts)

      if (children.length) attach(proxied || el, 'appendChild', children)
    }

    iscomponent
      ? !componentHandled && updateComponent(el)
      : CR(el, true, iscomponent)

    return proxied || el
  }, {text, body, svg, frag, html}), {get: infinifyDOM})

  /* global Text Node NodeList CustomEvent */

  const emit = (node, type, detail) => {
    node.dispatchEvent(typeof type !== 'string' ? type : new CustomEvent(type, {detail}))
    return node
  }

  // vpend - virtual append, add nodes and append them as a document fragment
  const vpend = (
    children,
    host,
    connector = 'appendChild',
    dfrag = frag(),
    noHostAppend
  ) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      if (child instanceof Function) {
        if ((child = child(host)) === host) {
          continue
        } else if (child instanceof Function) {
          let lvl = 0
          let ishost = false
          while (child instanceof Function && lvl < 25) {
            child = child()
            if ((ishost = child === host)) break
            lvl++
          }
          if (ishost) continue
        }
      }

      const childtype = typeof child
      if (childtype === 'string' || childtype === 'number') {
        if (!child.length) continue
        child = new Text(child)
      } else if (isArr(child)) {
        child = vpend(child, host, connector, dfrag, true)
      }

      if (child instanceof Node) {
        dfrag.appendChild(child)
        children[i] = child
      }
    }
    if (host && !noHostAppend) {
      run(() => {
        host[connector](dfrag)
      })
    }
    return children
  }

  /*
  * prime takes an array of renderable entities
  * and turns them into just nodes and functions
  * (to be degloved later rather than sooner [by vpend])
  */
  const prime = (...nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i]
      const ntype = typeof n
      if (n == null || ntype === 'boolean') {
        nodes.splice(i, 1)
        continue
      }
      if (n instanceof Node || n instanceof Function) {
        continue
      } else if (ntype === 'string' || ntype === 'number') {
        const nextI = i + 1
        if (nextI < nodes.length) {
          const next = nodes[nextI]
          const nexttype = typeof next
          if (nexttype === 'string' || nexttype === 'number') {
            nodes[i] = String(n) + String(next)
            nodes.splice(nextI, 1)
            i--
          }
        } else {
          nodes[i] = new Text(String(n))
        }
        continue
      }

      const isnl = n instanceof NodeList
      if (isnl) {
        if (n.length < 2) {
          nodes[i] = n[0]
          continue
        }
        n = Array.from(n)
      } else if (n.constructor === Object) {
        n = Object.values(n)
      }

      if (isArr(n)) {
        if (!isnl) {
          n = prime.apply(null, n)
          if (n.length < 2) {
            nodes[i] = n[0]
            i--
            continue
          }
        }
        nodes.splice(i, 1, ...n)
        i--
      } else if (n != null) {
        throw new Error(`illegal renderable: ${n}`)
      }
    }
    return nodes
  }

  /*
  * attach renderables to a host node via a connector
  * like append, prepend, before, after
  * independant of load state
  */
  const attach = (host, connector, ...renderables) => {
    if (host instanceof Function && !isProxyNode(host)) host = host()
    if (renderables.length === 1 && isArr(renderables[0])) {
      renderables = renderables[0]
    }

    const nodeHost = host instanceof Node || isProxyNode(host)
    renderables = prime(renderables)
    if (nodeHost) {
      if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
        once.mount(host, e => attach(host, connector, ...renderables))
      } else {
        vpend(renderables, host, connector)
      }
    } else if (typeof host === 'string') {
      return queryAsync(host).then(h => attach(h, connector, ...renderables))
    } if (isArr(host)) {
      host.push(...renderables)
    }
    return renderables.length === 1 ? renderables[0] : renderables
  }

  /*
  * render attaches a node to another
  *
  */
  const render = (
    node,
    host = document.body || 'body',
    connector = 'appendChild'
  ) => attach(host, connector, node)

  const domfn = {
    css (node, styles, prop) {
      if (styles == null) {
        if (document.defaultView) {
          return document.defaultView.getComputedStyle(node)
        }
      } else if (styles.constructor === Object) {
        for (const key in styles) domfn.css(node, key, styles[key])
      } else if (typeof styles === 'string') {
        if (prop == null) {
          if (styles && styles[0] === '-') return node.getPropertyValue(styles)
          if (document.defaultView) {
            const style = document.defaultView.getComputedStyle(node)
            if (style) return styles ? style[styles] : style
          }
        } else if (styles[0] === '-') {
          node.style.setProperty(styles, prop)
        } else {
          node.style[styles] = prop
        }
      }
      return node
    },

    class (node, c, state) {
      if (!node || c == null || !node.classList) return node

      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) {
          domfn.class(node[i], c, state)
        }
        return node
      }

      if (c.constructor === Object) {
        for (const name in c) domfn.class(node, name, c[name])
      } else {
        if (typeof c === 'string') c = c.split(' ')
        if (isArr(c)) {
          const noState = typeof state !== 'boolean'
          for (let i = 0; i < c.length; i++) {
            node.classList[noState ? 'toggle' : state ? 'add' : 'remove'](c[i])
          }
        }
      }
      return node
    },

    hasClass: curry((node, name) => node.classList.contains(name)),

    attr (node, attr, val) {
      if (attr.constructor === Object) {
        for (const a in attr) {
          const present = attr[a] == null
          node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
          attributeChange(node, a, null, attr[a], !present)
        }
      } else if (typeof attr === 'string') {
        const old = node.getAttribute(attr)
        if (val == null) return old
        node.setAttribute(attr, val)
        attributeChange(node, attr, old, val)
      }
      return node
    },

    removeAttribute (node, ...attrs) {
      if (attrs.length === 1) {
        node.removeAttribute(attrs[0])
        attributeChange(node, attrs[0], null, null, false)
      } else {
        for (let i = 0; i < attrs.length; i++) {
          if (isArr(attrs[i])) {
            attrs.splice(i, 1, ...attrs[i])
            i--
          }
          node.removeAttribute(attrs[i])
          attributeChange(node, attrs[i], null, null, false)
        }
      }
      return node
    },

    attrToggle (
      node,
      name,
      state = !node.hasAttribute(name),
      val = node.getAttribute(name) || ''
    ) {
      node[state ? 'setAttribute' : 'removeAttribute'](name, val)
      attributeChange(node, name, state ? val : null, state ? null : val, state)
      return node
    },

    emit,

    append (node, ...children) {
      attach(node, 'appendChild', ...children)
      return node
    },

    prepend (node, ...children) {
      attach(node, 'prepend', ...children)
      return node
    },

    appendTo (node, host) {
      attach(host, 'appendChild', node)
      return node
    },

    prependTo (node, host) {
      attach(host, 'prepend', node)
      return node
    },

    clear (node) {
      node[isInput(node) ? 'value' : 'textContent'] = ''
      return node
    },

    refurbish (node) {
      for (const {name} of node.attributes) {
        node.removeAttribute(name)
      }
      node.removeAttribute('class')
      return domfn.clear(node)
    },

    remove (node, after) {
      if (node instanceof Function) node = node()
      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) domfn.remove(node[i], after)
      } else if (isNum(after)) {
        setTimeout(() => domfn.remove(node), after)
      } else if (isMounted(node)) {
        run(() => node.remove())
      } else if (isNodeList(node)) {
        for (let i = 0; i < node.length; i++) domfn.remove(node[i])
      }
      return node
    },

    replace (node, newnode) {
      if (newnode instanceof Function) newnode = newnode()
      run(() => node.replaceWith(newnode))
      return newnode
    },

    find (node, query$$1, pure) {
      query$$1 = queryAll(query$$1, node)
      return pure ? query$$1 : query$$1.map(n => $(n))
    },

    findOne: (node, q, pure) =>
      pure ? query(q, node) : (q = query(q, node)) ? $(q) : q
  }
  domfn.empty = domfn.clear

  /* global Text Node */

  const state = (data, host) => {
    data = assign(Object.create(null), data || {})
    const binds = state.binds()

    const bind = (key, fn, revoke, intermediate) => {
      if (isInput(fn, true)) return bind.input(key, fn, revoke)
      if (intermediate) fn = intermediate(fn, proxy)
      binds.add(key, fn = fn.bind(host))
      if (key in data) fn(data[key], undefined, proxy, host)
      fn.revoke = () => {
        if (revoke) revoke(proxy)
        binds.remove(key, fn)
      }
      return fn
    }

    bind.text = (key, revoke) => {
      const txt = new Text()
      const bindFN = val => {
        txt.textContent = val
      }
      bind(key, bindFN, () => {
        if (revoke) revoke(proxy)
        domfn.remove(txt)
      })
      if (key in data) bindFN(data[key])
      return txt
    }

    bind.input = (key, input, revoke) => {
      if (isStr(input)) input = query(input)
      if (input == null) throw new Error(`bind ${key}: invalid/nil input element)`)
      if (input instanceof Node) input = $(input)
      let shouldUpdate = true
      const realInput = isInput(input)
      const bindFN = val => {
        if (shouldUpdate) {
          realInput ? input.value = val : input.innerText = val
        }
      }
      const listener = input.on.input(e => {
        shouldUpdate = false
        proxy[key] = input.value
        shouldUpdate = true
      })
      bind(key, bindFN, () => {
        if (revoke) revoke(proxy)
        listener.off()
      })
      if (key in data) bindFN(data[key])
      return input
    }

    const deleteProperty = key => {
      binds.remove(key)
      return delete data[key]
    }

    const proxy = new Proxy((strings, ...keys) => {
      if (strings.constructor === Object) {
        const silent = keys[0] === true
        for (const key in strings) {
          (silent ? data : proxy)[key] = strings[key]
        }
      } else if (typeof strings === 'string') {
        (keys[1] === true ? data : proxy)[strings] = keys[0]
      } else if (isArr(strings)) {
        return flatten(
          keys.reduce(
            (prev, cur, i) => [prev, bind.text(cur), strings[i + 1]],
            strings[0]
          ).filter(s => !isStr(s) || s.length)
        )
      } else if (isInput(strings, true) && typeof keys[0] === 'string') {
        return bind.input(strings, ...keys)
      }
      return proxy
    }, {
      get: (fn, key) => key === 'bind' ? bind
        : key === 'binds' ? binds
          : key[0] === '$' ? bind.bind(null, key.substr(1))
            : Reflect.get(data, key),

      set (fn, key, val) {
        if (val == null) {
          deleteProperty(key)
        } else {
          const old = data[key]
          if (val !== old) {
            data[key] = val
            binds.each(key, bind => bind(val, old, proxy, host))
          }
        }
        return true
      },
      deleteProperty: (fn, key) => deleteProperty(key)
    })

    return proxy
  }

  state.binds = (binds = new Map()) => assign(binds, {
    add (key, fn) {
      if (!binds.has(key)) binds.set(key, new Set())
      binds.get(key).add(fn)
    },
    remove (key, fn) {
      if (binds.has(key)) {
        fn ? binds.get(key).delete(fn) : binds.each(key, bind => bind.revoke())
        if (!binds.get(key).size) binds.delete(key)
      }
    },
    each (key, fn) {
      if (binds.has(key)) binds.get(key).forEach(fn)
    }
  })

  /* global Node */

  const ProxiedNodes = new Map()

  const $ = node => {
    if (isProxyNode(node)) return node
    if (typeof node === 'string') {
      node = query(node)
      if (!node) throw new Error('$: no match')
    }
    if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
    if (!(node instanceof Node)) {
      throw new TypeError(`$ needs a Node: ${node}`)
    }

    const Class = new Proxy((c, state$$1) => {
      domfn.class(node, c, state$$1)
      return proxy
    }, {
      get: (fn, key) => node.classList.contains(key),
      set: (fn, key, val) => fn(key, val),
      deleteProperty: (_, key) => !!node.classList.remove(key)
    })

    if (isEl(node)) {
      var getAttr = node.getAttribute.bind(node)
      var hasAttr = node.hasAttribute.bind(node)
      var rmAttr = domfn.removeAttribute.bind(null, node)
      var Attr = new Proxy((attr, val) => {
        const result = domfn.attr(node, attr, val)
        return result === node ? proxy : result
      }, {
        get: (fn, key) => key === 'has' ? hasAttr : key === 'remove' ? rmAttr : getAttr(key),

        set (fn, key, val) {
          key === 'remove' ? rmAttr(val) : fn(key, val)
          return true
        },
        deleteProperty: (_, key) => domfn.removeAttribute(node, key)
      })
    }

    const isinput = isInput(node)
    const textContent = isinput ? 'value' : 'textContent'
    const innerHTML = isinput ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML'

    const once$$1 = infinify(EventManager(true, node), false)
    const on$$1 = infinify(EventManager(false, node), false)

    const proxy = new Proxy(
      Object.assign(fn => {
        if (fn instanceof Function && !isProxyNode(fn)) {
          fn.call(node, proxy, node)
        }
        return node
      }, {
        class: Class,
        attr: Attr,
        on: on$$1,
        once: once$$1,
        emit: emit.bind(null, node),
        render: render.bind(null, node)
      }),
      {
        get (fn, key) {
          if (Reflect.has(fn, key)) return Reflect.get(fn, key)
          else if (key === 'state') return fn[key] || (fn[key] = state(null, proxy))
          else if (key === 'txt') return node[textContent]
          else if (key === 'html') return node[innerHTML]
          else if (key === 'mounted') return isMounted(node)
          /*
          // still thinking about how to make this work
          else if (key === 'mounting') {
            return new Promise(resolve => {
              if (isMounted(node) || node.parentNode) return resolve(proxy.parent)
              proxy.once.mount(e => resolve(proxy.parent))
            })
          }
          */
          else if (key === 'children') return Array.from(node.children)
          else if (key === '$children') return Array.prototype.map.call(node.children, $)
          else if (key === 'parent' && node.parentNode) return $(node.parentNode)
          else if (key in domfn) {
            return (...args) => {
              const result = domfn[key](node, ...args)
              return result === node || result === proxy ? proxy : result
            }
          } else if (key === ProxyNodeSymbol) return true
          const val = node[key]
          return isFunc(val) && !isProxyNode(val) ? val.bind(node) : val
        },
        set (fn, key, val) {
          if (key === 'class') Class(node, val)
          else if (key === 'attr') Attr(node, val)
          else if (key === 'css') domfn.css(node, val)
          else if (key === 'state') (fn[key] || proxy[key])(val)
          else if (key === 'txt') node[textContent] = val
          else if (key === 'html' || key === 'children') {
            if (isStr(val)) {
              node[innerHTML] = val
            } else {
              node[textContent] = ''
              vpend(prime(val), node)
            }
          } else {
            node[key] = val
          }
          return true
        }
      }
    )
    ProxiedNodes.set(node, proxy)

    return proxy
  }

  /* global CustomEvent */

  /* const watched = Object.create(null)
  const watch = (name, opts) => {
    if (opts == null) throw new TypeError(`attr.watch: useless watcher opts == null`)
    watched[name] = opts = Object.assign(Object.create(null), opts)
  }
  watch.update = (name, el, value = el.getAttribute(name)) => {}
  */

  const Initiated = new Map()
  const beenInitiated = (name, el) =>
    Initiated.has(name) && Initiated.get(name)(el)

  const attributeObserver = (el, name, opts) => {
    el = $(el)
    let {init, update, remove} = opts
    if (!init && !update && opts instanceof Function) {
      [init, update] = [opts, opts]
    }
    const intialize = (present, value) => {
      if (present && !beenInitiated(name, el)) {
        if (init) init(el, value)
        if (!Initiated.has(name)) {
          Initiated.set(name, mutateSet(new WeakSet()))
        }
        Initiated.get(name)(el, true)
        return true
      }
      return beenInitiated(name, el)
    }
    let removedBefore = false
    let old = el.attr[name]
    intialize(el.attr.has(name), old)
    const stop = el.on.attr(({name: attrName, value, oldvalue, present}) => {
      if (
        attrName === name &&
        old !== value &&
        value !== oldvalue &&
        intialize(present, value)
      ) {
        if (present) {
          if (update) update(el, value, old)
          removedBefore = false
        } else if (!removedBefore) {
          if (remove) remove(el, value, old)
          removedBefore = true
        }
        old = value
      }
    })

    const manager = () => {
      stop()
      if (Initiated.has(name)) Initiated.get(name)(el, false)
    }
    manager.start = () => {
      stop.on()
      Initiated.get(name)(el, true)
    }
    return (manager.stop = manager)
  }

  const directives = new Map()
  const directive = (name, opts) => {
    const directive = new Map()
    directive.init = el => {
      if (!beenInitiated(name, el)) {
        directive.set(el, attributeObserver(el, name, opts))
      }
    }
    directive.stop = el => {
      if (directive.has(el)) directive.get(el)()
    }
    directives.set(name, directive)
    run(() => queryEach('[' + name + ']', n => attributeChange(n, name)))
    return directive
  }

  const attributeChange = (
    el,
    name,
    oldvalue,
    value = el.getAttribute(name),
    present = el.hasAttribute(name)
  ) => {
    if (directives.has(name)) directives.get(name).init($(el))
    if (value !== oldvalue) {
      el.dispatchEvent(assign(new CustomEvent('attr'), {
        name,
        value,
        oldvalue,
        present
      }))
    }
  }

  /* global CustomEvent MutationObserver Element */

  const Created = mutateSet(new WeakSet())
  const Mounted = mutateSet(new WeakSet())
  const Unmounted = mutateSet(new WeakSet())

  const dispatch = (n, state) => {
    n.dispatchEvent(new CustomEvent(state))
  }

  const CR = (n, undone = !Created(n), component$$1 = isComponent(n)) => {
    if (undone && !component$$1) {
      Created(n, true)
      dispatch(n, 'create')
    }
  }

  const MNT = (n, iscomponent = isComponent(n)) => {
    CR(n, !Created(n), iscomponent)
    if (!Mounted(n) && n.parentNode) {
      if (Unmounted(n)) {
        Unmounted(n, false)
        dispatch(n, 'remount')
        if (n.childNodes.length) {
          for (let i = 0; i < n.childNodes.length; i++) {
            UnmountNodes(n.childNodes[i])
          }
        }
        return
      }
      if (!iscomponent) Mounted(n, true)
      dispatch(n, 'mount')
      if (n.childNodes.length) {
        for (let i = 0; i < n.childNodes.length; i++) {
          MountNodes(n.childNodes[i])
        }
      }
      if (n instanceof Element) {
        for (const attr of directives.keys()) {
          const has = n.hasAttribute(attr)
          if (has) attributeChange(n, attr, null, n.getAttribute(attr), has)
        }
      }
    }
  }

  const UNMNT = n => {
    Mounted(n, false)
    Unmounted(n, true)
    dispatch(n, 'unmount')
  }

  const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
  const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

  new MutationObserver(muts => {
    for (const mut of muts) {
      const {addedNodes, removedNodes, attributeName} = mut
      if (addedNodes.length) {
        for (const node of addedNodes) MountNodes(node)
      }
      if (removedNodes.length) {
        for (const node of removedNodes) UnmountNodes(node)
      }
      if (attributeName != null) {
        attributeChange(mut.target, attributeName, mut.oldValue)
      }
    }
  }).observe(document, {
    attributes: true,
    attributeOldValue: true,
    childList: true,
    subtree: true
  })

  const components = new Map()
  const component = (tagName, config) => {
    if (isFunc(config)) config = config()
    if (tagName.indexOf('-') === -1) {
      throw new Error(`component: ${tagName} tagName is un-hyphenated`)
    }
    components.set(tagName.toUpperCase(), config)
    run(() => queryEach(tagName, el => updateComponent(el)))
    return dom[tagName]
  }
  component.plugin = plugin => {
    if (isObj(plugin)) {
      if (!component.plugins) component.plugins = {}
      for (const key in plugin) {
        if (!(key in component.plugins)) component.plugins[key] = new Set()
        component.plugins.add(plugin[key])
      }
    }
  }

  const updateComponent = (el, config, stage, afterProps) => {
    if (el.nodeType !== 1 || !components.has(el.tagName)) return
    if (isStr(config)) [stage, config] = [config, components.get(el.tagName)]
    else if (!isObj(config)) config = components.get(el.tagName)

    const {
      create,
      mount,
      remount,
      unmount,
      props,
      methods,
      attr,
      state
    } = config
    const proxied = $(el)

    if (!Created(el)) {
      proxied.state = merge(clone(state, true), proxied.state)
      el[ComponentSymbol] = el.tagName

      if (methods) assimilate.methods(el, methods)
      if (props) assimilate.props(el, props)
      if (afterProps) assimilate.props(el, afterProps)
      Created(el, true)
      if (create) create.call(el, proxied)

      if (component.plugins) {
        component.plugins.config.forEach(fn => {
          fn.bind(el, config, proxied, el)
        })
        component.plugins.create.forEach(fn => {
          fn.bind(el, proxied, el)
        })
      }

      dispatch(el, 'create')

      if (isObj(config.on)) proxied.on(config.on)
      if (isObj(config.once)) proxied.once(config.once)

      if (isObj(attr)) {
        proxied.state.observedAttrs = Object.create(null)
        for (const name in attr) {
          proxied.state.observedAttrs[name] = attributeObserver(el, name, attr[name])
        }
      }
      if (remount) proxied.on.remount(remount.bind(el, proxied))
    }

    if (!Mounted(el) && (stage === 'mount' || isMounted(el))) {
      if (Unmounted(el)) {
        component.plugins && component.plugins.remount.forEach(fn => {
          fn.bind(el, proxied, el)
        })
        for (const name in proxied.state.observedAttrs) {
          proxied.state.observedAttrs[name].start()
        }
        if (remount) remount.call(el, proxied)
        dispatch(el, 'remount')
      } else {
        Mounted(el, true)
        component.plugins && component.plugins.mount.forEach(fn => {
          fn.bind(el, proxied, el)
        })
        if (mount) mount.call(el, proxied)
        dispatch(el, 'mount')
      }
    } else if (stage === 'unmount') {
      Mounted(el, false)
      Unmounted(el, true)
      component.plugins && component.plugins.unmount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      for (const name in proxied.state.observedAttrs) {
        proxied.state.observedAttrs[name].stop()
      }
      if (unmount) unmount.call(el, proxied)
      dispatch(el, stage)
    }
    return el
  }

  exports.isArr = isArr
  exports.isComponent = isComponent
  exports.isNil = isNil
  exports.isDef = isDef
  exports.isObj = isObj
  exports.isFunc = isFunc
  exports.isBool = isBool
  exports.isStr = isStr
  exports.isNum = isNum
  exports.isArrlike = isArrlike
  exports.isNodeList = isNodeList
  exports.isNode = isNode
  exports.isMounted = isMounted
  exports.isPrimitive = isPrimitive
  exports.isPromise = isPromise
  exports.isProxyNode = isProxyNode
  exports.isRenderable = isRenderable
  exports.isRegExp = isRegExp
  exports.isInt = isInt
  exports.isInput = isInput
  exports.isEmpty = isEmpty
  exports.isEl = isEl
  exports.isSvg = isSvg
  exports.allare = allare
  exports.attributeObserver = attributeObserver
  exports.flatten = flatten
  exports.curry = curry
  exports.compose = compose
  exports.components = components
  exports.component = component
  exports.run = run
  exports.render = render
  exports.query = query
  exports.queryAsync = queryAsync
  exports.queryAll = queryAll
  exports.queryEach = queryEach
  exports.on = on
  exports.once = once
  exports.each = each
  exports.svg = svg
  exports.dom = dom
  exports.domfn = domfn
  exports.html = html
  exports.directive = directive
  exports.directives = directives
  exports.prime = prime
  exports.merge = merge
  exports.Mounted = Mounted
  exports.Unmounted = Unmounted
  exports.Created = Created
  exports.$ = $

  Object.defineProperty(exports, '__esModule', { value: true })
}))
