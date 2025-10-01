
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    /*
    object-assign
    (c) Sindre Sorhus
    @license MIT
    */
    /* eslint-disable no-unused-vars */
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;

    function toObject(val) {
    	if (val === null || val === undefined) {
    		throw new TypeError('Object.assign cannot be called with null or undefined');
    	}

    	return Object(val);
    }

    function shouldUseNative() {
    	try {
    		if (!Object.assign) {
    			return false;
    		}

    		// Detect buggy property enumeration order in older V8 versions.

    		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    		test1[5] = 'de';
    		if (Object.getOwnPropertyNames(test1)[0] === '5') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test2 = {};
    		for (var i = 0; i < 10; i++) {
    			test2['_' + String.fromCharCode(i)] = i;
    		}
    		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    			return test2[n];
    		});
    		if (order2.join('') !== '0123456789') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test3 = {};
    		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    			test3[letter] = letter;
    		});
    		if (Object.keys(Object.assign({}, test3)).join('') !==
    				'abcdefghijklmnopqrst') {
    			return false;
    		}

    		return true;
    	} catch (err) {
    		// We don't expect any of the above to throw, but better to be safe.
    		return false;
    	}
    }

    var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
    	var from;
    	var to = toObject(target);
    	var symbols;

    	for (var s = 1; s < arguments.length; s++) {
    		from = Object(arguments[s]);

    		for (var key in from) {
    			if (hasOwnProperty.call(from, key)) {
    				to[key] = from[key];
    			}
    		}

    		if (getOwnPropertySymbols) {
    			symbols = getOwnPropertySymbols(from);
    			for (var i = 0; i < symbols.length; i++) {
    				if (propIsEnumerable.call(from, symbols[i])) {
    					to[symbols[i]] = from[symbols[i]];
    				}
    			}
    		}
    	}

    	return to;
    };

    var core = {exports: {}};

    /**
     * Mixin a feature to the core/Ros prototype.
     * For example, mixin(Ros, ['Topic'], {Topic: <Topic>})
     * will add a topic bound to any Ros instances so a user
     * can call `var topic = ros.Topic({name: '/foo'});`
     *
     * @author Graeme Yeates - github.com/megawac
     */

    var mixin;
    var hasRequiredMixin;

    function requireMixin () {
    	if (hasRequiredMixin) return mixin;
    	hasRequiredMixin = 1;
    	mixin = function(Ros, classes, features) {
    	    classes.forEach(function(className) {
    	        var Class = features[className];
    	        Ros.prototype[className] = function(options) {
    	            options.ros = this;
    	            return new Class(options);
    	        };
    	    });
    	};
    	return mixin;
    }

    var WebSocket_1;
    var hasRequiredWebSocket;

    function requireWebSocket () {
    	if (hasRequiredWebSocket) return WebSocket_1;
    	hasRequiredWebSocket = 1;
    	WebSocket_1 = typeof window !== 'undefined' ? window.WebSocket : WebSocket;
    	return WebSocket_1;
    }

    var webworkify;
    var hasRequiredWebworkify;

    function requireWebworkify () {
    	if (hasRequiredWebworkify) return webworkify;
    	hasRequiredWebworkify = 1;
    	var bundleFn = arguments[3];
    	var sources = arguments[4];
    	var cache = arguments[5];

    	var stringify = JSON.stringify;

    	webworkify = function (fn, options) {
    	    var wkey;
    	    var cacheKeys = Object.keys(cache);

    	    for (var i = 0, l = cacheKeys.length; i < l; i++) {
    	        var key = cacheKeys[i];
    	        var exp = cache[key].exports;
    	        // Using babel as a transpiler to use esmodule, the export will always
    	        // be an object with the default export as a property of it. To ensure
    	        // the existing api and babel esmodule exports are both supported we
    	        // check for both
    	        if (exp === fn || exp && exp.default === fn) {
    	            wkey = key;
    	            break;
    	        }
    	    }

    	    if (!wkey) {
    	        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    	        var wcache = {};
    	        for (var i = 0, l = cacheKeys.length; i < l; i++) {
    	            var key = cacheKeys[i];
    	            wcache[key] = key;
    	        }
    	        sources[wkey] = [
    	            'function(require,module,exports){' + fn + '(self); }',
    	            wcache
    	        ];
    	    }
    	    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

    	    var scache = {}; scache[wkey] = wkey;
    	    sources[skey] = [
    	        'function(require,module,exports){' +
    	            // try to call default if defined to also support babel esmodule exports
    	            'var f = require(' + stringify(wkey) + ');' +
    	            '(f.default ? f.default : f)(self);' +
    	        '}',
    	        scache
    	    ];

    	    var workerSources = {};
    	    resolveSources(skey);

    	    function resolveSources(key) {
    	        workerSources[key] = true;

    	        for (var depPath in sources[key][1]) {
    	            var depKey = sources[key][1][depPath];
    	            if (!workerSources[depKey]) {
    	                resolveSources(depKey);
    	            }
    	        }
    	    }

    	    var src = '(' + bundleFn + ')({'
    	        + Object.keys(workerSources).map(function (key) {
    	            return stringify(key) + ':['
    	                + sources[key][0]
    	                + ',' + stringify(sources[key][1]) + ']'
    	            ;
    	        }).join(',')
    	        + '},{},[' + stringify(skey) + '])'
    	    ;

    	    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    	    var blob = new Blob([src], { type: 'text/javascript' });
    	    if (options && options.bare) { return blob; }
    	    var workerUrl = URL.createObjectURL(blob);
    	    var worker = new Worker(workerUrl);
    	    worker.objectURL = workerUrl;
    	    return worker;
    	};
    	return webworkify;
    }

    var webworkifyWebpack = {exports: {}};

    var hasRequiredWebworkifyWebpack;

    function requireWebworkifyWebpack () {
    	if (hasRequiredWebworkifyWebpack) return webworkifyWebpack.exports;
    	hasRequiredWebworkifyWebpack = 1;
    	(function (module) {
    		function webpackBootstrapFunc (modules) {
    		/******/  // The module cache
    		/******/  var installedModules = {};

    		/******/  // The require function
    		/******/  function __webpack_require__(moduleId) {

    		/******/    // Check if module is in cache
    		/******/    if(installedModules[moduleId])
    		/******/      return installedModules[moduleId].exports;

    		/******/    // Create a new module (and put it into the cache)
    		/******/    var module = installedModules[moduleId] = {
    		/******/      i: moduleId,
    		/******/      l: false,
    		/******/      exports: {}
    		/******/    };

    		/******/    // Execute the module function
    		/******/    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

    		/******/    // Flag the module as loaded
    		/******/    module.l = true;

    		/******/    // Return the exports of the module
    		/******/    return module.exports;
    		/******/  }

    		/******/  // expose the modules object (__webpack_modules__)
    		/******/  __webpack_require__.m = modules;

    		/******/  // expose the module cache
    		/******/  __webpack_require__.c = installedModules;

    		/******/  // identity function for calling harmony imports with the correct context
    		/******/  __webpack_require__.i = function(value) { return value; };

    		/******/  // define getter function for harmony exports
    		/******/  __webpack_require__.d = function(exports, name, getter) {
    		/******/    if(!__webpack_require__.o(exports, name)) {
    		/******/      Object.defineProperty(exports, name, {
    		/******/        configurable: false,
    		/******/        enumerable: true,
    		/******/        get: getter
    		/******/      });
    		/******/    }
    		/******/  };

    		/******/  // define __esModule on exports
    		/******/  __webpack_require__.r = function(exports) {
    		/******/    Object.defineProperty(exports, '__esModule', { value: true });
    		/******/  };

    		/******/  // getDefaultExport function for compatibility with non-harmony modules
    		/******/  __webpack_require__.n = function(module) {
    		/******/    var getter = module && module.__esModule ?
    		/******/      function getDefault() { return module['default']; } :
    		/******/      function getModuleExports() { return module; };
    		/******/    __webpack_require__.d(getter, 'a', getter);
    		/******/    return getter;
    		/******/  };

    		/******/  // Object.prototype.hasOwnProperty.call
    		/******/  __webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

    		/******/  // __webpack_public_path__
    		/******/  __webpack_require__.p = "/";

    		/******/  // on error function for async loading
    		/******/  __webpack_require__.oe = function(err) { console.error(err); throw err; };

    		  var f = __webpack_require__(__webpack_require__.s = ENTRY_MODULE);
    		  return f.default || f // try to call default if defined to also support babel esmodule exports
    		}

    		var moduleNameReqExp = '[\\.|\\-|\\+|\\w|\/|@]+';
    		var dependencyRegExp = '\\(\\s*(\/\\*.*?\\*\/)?\\s*.*?(' + moduleNameReqExp + ').*?\\)'; // additional chars when output.pathinfo is true

    		// http://stackoverflow.com/a/2593661/130442
    		function quoteRegExp (str) {
    		  return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
    		}

    		function isNumeric(n) {
    		  return !isNaN(1 * n); // 1 * n converts integers, integers as string ("123"), 1e3 and "1e3" to integers and strings to NaN
    		}

    		function getModuleDependencies (sources, module, queueName) {
    		  var retval = {};
    		  retval[queueName] = [];

    		  var fnString = module.toString();
    		  var wrapperSignature = fnString.match(/^function\s?\w*\(\w+,\s*\w+,\s*(\w+)\)/);
    		  if (!wrapperSignature) return retval
    		  var webpackRequireName = wrapperSignature[1];

    		  // main bundle deps
    		  var re = new RegExp('(\\\\n|\\W)' + quoteRegExp(webpackRequireName) + dependencyRegExp, 'g');
    		  var match;
    		  while ((match = re.exec(fnString))) {
    		    if (match[3] === 'dll-reference') continue
    		    retval[queueName].push(match[3]);
    		  }

    		  // dll deps
    		  re = new RegExp('\\(' + quoteRegExp(webpackRequireName) + '\\("(dll-reference\\s(' + moduleNameReqExp + '))"\\)\\)' + dependencyRegExp, 'g');
    		  while ((match = re.exec(fnString))) {
    		    if (!sources[match[2]]) {
    		      retval[queueName].push(match[1]);
    		      sources[match[2]] = __webpack_require__(match[1]).m;
    		    }
    		    retval[match[2]] = retval[match[2]] || [];
    		    retval[match[2]].push(match[4]);
    		  }

    		  // convert 1e3 back to 1000 - this can be important after uglify-js converted 1000 to 1e3
    		  var keys = Object.keys(retval);
    		  for (var i = 0; i < keys.length; i++) {
    		    for (var j = 0; j < retval[keys[i]].length; j++) {
    		      if (isNumeric(retval[keys[i]][j])) {
    		        retval[keys[i]][j] = 1 * retval[keys[i]][j];
    		      }
    		    }
    		  }

    		  return retval
    		}

    		function hasValuesInQueues (queues) {
    		  var keys = Object.keys(queues);
    		  return keys.reduce(function (hasValues, key) {
    		    return hasValues || queues[key].length > 0
    		  }, false)
    		}

    		function getRequiredModules (sources, moduleId) {
    		  var modulesQueue = {
    		    main: [moduleId]
    		  };
    		  var requiredModules = {
    		    main: []
    		  };
    		  var seenModules = {
    		    main: {}
    		  };

    		  while (hasValuesInQueues(modulesQueue)) {
    		    var queues = Object.keys(modulesQueue);
    		    for (var i = 0; i < queues.length; i++) {
    		      var queueName = queues[i];
    		      var queue = modulesQueue[queueName];
    		      var moduleToCheck = queue.pop();
    		      seenModules[queueName] = seenModules[queueName] || {};
    		      if (seenModules[queueName][moduleToCheck] || !sources[queueName][moduleToCheck]) continue
    		      seenModules[queueName][moduleToCheck] = true;
    		      requiredModules[queueName] = requiredModules[queueName] || [];
    		      requiredModules[queueName].push(moduleToCheck);
    		      var newModules = getModuleDependencies(sources, sources[queueName][moduleToCheck], queueName);
    		      var newModulesKeys = Object.keys(newModules);
    		      for (var j = 0; j < newModulesKeys.length; j++) {
    		        modulesQueue[newModulesKeys[j]] = modulesQueue[newModulesKeys[j]] || [];
    		        modulesQueue[newModulesKeys[j]] = modulesQueue[newModulesKeys[j]].concat(newModules[newModulesKeys[j]]);
    		      }
    		    }
    		  }

    		  return requiredModules
    		}

    		module.exports = function (moduleId, options) {
    		  options = options || {};
    		  var sources = {
    		    main: __webpack_modules__
    		  };

    		  var requiredModules = options.all ? { main: Object.keys(sources.main) } : getRequiredModules(sources, moduleId);

    		  var src = '';

    		  Object.keys(requiredModules).filter(function (m) { return m !== 'main' }).forEach(function (module) {
    		    var entryModule = 0;
    		    while (requiredModules[module][entryModule]) {
    		      entryModule++;
    		    }
    		    requiredModules[module].push(entryModule);
    		    sources[module][entryModule] = '(function(module, exports, __webpack_require__) { module.exports = __webpack_require__; })';
    		    src = src + 'var ' + module + ' = (' + webpackBootstrapFunc.toString().replace('ENTRY_MODULE', JSON.stringify(entryModule)) + ')({' + requiredModules[module].map(function (id) { return '' + JSON.stringify(id) + ': ' + sources[module][id].toString() }).join(',') + '});\n';
    		  });

    		  src = src + 'new ((' + webpackBootstrapFunc.toString().replace('ENTRY_MODULE', JSON.stringify(moduleId)) + ')({' + requiredModules.main.map(function (id) { return '' + JSON.stringify(id) + ': ' + sources.main[id].toString() }).join(',') + '}))(self);';

    		  var blob = new window.Blob([src], { type: 'text/javascript' });
    		  if (options.bare) { return blob }

    		  var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    		  var workerUrl = URL.createObjectURL(blob);
    		  var worker = new window.Worker(workerUrl);
    		  worker.objectURL = workerUrl;

    		  return worker
    		}; 
    	} (webworkifyWebpack));
    	return webworkifyWebpack.exports;
    }

    var workerSocketImpl;
    var hasRequiredWorkerSocketImpl;

    function requireWorkerSocketImpl () {
    	if (hasRequiredWorkerSocketImpl) return workerSocketImpl;
    	hasRequiredWorkerSocketImpl = 1;
    	var WebSocket = WebSocket || requireWebSocket();

    	workerSocketImpl = function(self) {
    	  var socket = null;

    	  function handleSocketMessage(ev) {
    	    var data = ev.data;

    	    if (data instanceof ArrayBuffer) {
    	      // binary message, transfer for speed
    	      self.postMessage(data, [data]);
    	    } else {
    	      // JSON message, copy string
    	      self.postMessage(data);
    	    }
    	  }

    	  function handleSocketControl(ev) {
    	    self.postMessage({type: ev.type});
    	  }

    	  self.addEventListener('message', function(ev) {
    	    var data = ev.data;

    	    if (typeof data === 'string') {
    	      // JSON message from ROSLIB
    	      socket.send(data);
    	    } else {
    	      // control message
    	      if (data.hasOwnProperty('close')) {
    	        socket.close();
    	        socket = null;
    	      } else if (data.hasOwnProperty('uri')) {
    	        var uri = data.uri;

    	        socket = new WebSocket(uri);
    	        socket.binaryType = 'arraybuffer';

    	        socket.onmessage = handleSocketMessage;
    	        socket.onclose = handleSocketControl;
    	        socket.onopen = handleSocketControl;
    	        socket.onerror = handleSocketControl;
    	      } else {
    	        throw 'Unknown message to WorkerSocket';
    	      }
    	    }
    	  });
    	};
    	return workerSocketImpl;
    }

    var workerSocket;
    var hasRequiredWorkerSocket;

    function requireWorkerSocket () {
    	if (hasRequiredWorkerSocket) return workerSocket;
    	hasRequiredWorkerSocket = 1;
    	try {
    	    var work = requireWebworkify();
    	} catch(ReferenceError) {
    	    // webworkify raises ReferenceError when required inside webpack
    	    var work = requireWebworkifyWebpack();
    	}
    	var workerSocketImpl = requireWorkerSocketImpl();

    	function WorkerSocket(uri) {
    	  this.socket_ = work(workerSocketImpl);

    	  this.socket_.addEventListener('message', this.handleWorkerMessage_.bind(this));

    	  this.socket_.postMessage({
    	    uri: uri,
    	  });
    	}

    	WorkerSocket.prototype.handleWorkerMessage_ = function(ev) {
    	  var data = ev.data;
    	  if (data instanceof ArrayBuffer || typeof data === 'string') {
    	    // binary or JSON message from rosbridge
    	    this.onmessage(ev);
    	  } else {
    	    // control message from the wrapped WebSocket
    	    var type = data.type;
    	    if (type === 'close') {
    	      this.onclose(null);
    	    } else if (type === 'open') {
    	      this.onopen(null);
    	    } else if (type === 'error') {
    	      this.onerror(null);
    	    } else {
    	      throw 'Unknown message from workersocket';
    	    }
    	  }
    	};

    	WorkerSocket.prototype.send = function(data) {
    	  this.socket_.postMessage(data);
    	};

    	WorkerSocket.prototype.close = function() {
    	  this.socket_.postMessage({
    	    close: true
    	  });
    	};

    	workerSocket = WorkerSocket;
    	return workerSocket;
    }

    /* global document */

    var canvas;
    var hasRequiredCanvas;

    function requireCanvas () {
    	if (hasRequiredCanvas) return canvas;
    	hasRequiredCanvas = 1;
    	canvas = function Canvas() {
    		return document.createElement('canvas');
    	};
    	return canvas;
    }

    /**
     * @fileOverview
     * @author Graeme Yeates - github.com/megawac
     */

    var decompressPng_1;
    var hasRequiredDecompressPng;

    function requireDecompressPng () {
    	if (hasRequiredDecompressPng) return decompressPng_1;
    	hasRequiredDecompressPng = 1;

    	var Canvas = requireCanvas();
    	var Image = Canvas.Image || window.Image;

    	/**
    	 * If a message was compressed as a PNG image (a compression hack since
    	 * gzipping over WebSockets * is not supported yet), this function places the
    	 * "image" in a canvas element then decodes the * "image" as a Base64 string.
    	 *
    	 * @private
    	 * @param data - An object containing the PNG data.
    	 * @param callback - Function with the following params:
    	 * @param callback.data - The uncompressed data.
    	 */
    	function decompressPng(data, callback) {
    	  // Uncompresses the data before sending it through (use image/canvas to do so).
    	  var image = new Image();
    	  // When the image loads, extracts the raw data (JSON message).
    	  image.onload = function() {
    	    // Creates a local canvas to draw on.
    	    var canvas = new Canvas();
    	    var context = canvas.getContext('2d');

    	    // Sets width and height.
    	    canvas.width = image.width;
    	    canvas.height = image.height;

    	    // Prevents anti-aliasing and loosing data
    	    context.imageSmoothingEnabled = false;
    	    context.webkitImageSmoothingEnabled = false;
    	    context.mozImageSmoothingEnabled = false;

    	    // Puts the data into the image.
    	    context.drawImage(image, 0, 0);
    	    // Grabs the raw, uncompressed data.
    	    var imageData = context.getImageData(0, 0, image.width, image.height).data;

    	    // Constructs the JSON.
    	    var jsonData = '';
    	    for (var i = 0; i < imageData.length; i += 4) {
    	      // RGB
    	      jsonData += String.fromCharCode(imageData[i], imageData[i + 1], imageData[i + 2]);
    	    }
    	    callback(JSON.parse(jsonData));
    	  };
    	  // Sends the image data to load.
    	  image.src = 'data:image/png;base64,' + data;
    	}

    	decompressPng_1 = decompressPng;
    	return decompressPng_1;
    }

    var cbor = {exports: {}};

    /*
     * The MIT License (MIT)
     *
     * Copyright (c) 2014 Patrick Gansterer <paroga@paroga.com>
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */

    var hasRequiredCbor;

    function requireCbor () {
    	if (hasRequiredCbor) return cbor.exports;
    	hasRequiredCbor = 1;
    	(function (module) {
    		(function(global, undefined$1) {		var POW_2_24 = Math.pow(2, -24),
    		    POW_2_32 = Math.pow(2, 32),
    		    POW_2_53 = Math.pow(2, 53);

    		function encode(value) {
    		  var data = new ArrayBuffer(256);
    		  var dataView = new DataView(data);
    		  var lastLength;
    		  var offset = 0;

    		  function ensureSpace(length) {
    		    var newByteLength = data.byteLength;
    		    var requiredLength = offset + length;
    		    while (newByteLength < requiredLength)
    		      newByteLength *= 2;
    		    if (newByteLength !== data.byteLength) {
    		      var oldDataView = dataView;
    		      data = new ArrayBuffer(newByteLength);
    		      dataView = new DataView(data);
    		      var uint32count = (offset + 3) >> 2;
    		      for (var i = 0; i < uint32count; ++i)
    		        dataView.setUint32(i * 4, oldDataView.getUint32(i * 4));
    		    }

    		    lastLength = length;
    		    return dataView;
    		  }
    		  function write() {
    		    offset += lastLength;
    		  }
    		  function writeFloat64(value) {
    		    write(ensureSpace(8).setFloat64(offset, value));
    		  }
    		  function writeUint8(value) {
    		    write(ensureSpace(1).setUint8(offset, value));
    		  }
    		  function writeUint8Array(value) {
    		    var dataView = ensureSpace(value.length);
    		    for (var i = 0; i < value.length; ++i)
    		      dataView.setUint8(offset + i, value[i]);
    		    write();
    		  }
    		  function writeUint16(value) {
    		    write(ensureSpace(2).setUint16(offset, value));
    		  }
    		  function writeUint32(value) {
    		    write(ensureSpace(4).setUint32(offset, value));
    		  }
    		  function writeUint64(value) {
    		    var low = value % POW_2_32;
    		    var high = (value - low) / POW_2_32;
    		    var dataView = ensureSpace(8);
    		    dataView.setUint32(offset, high);
    		    dataView.setUint32(offset + 4, low);
    		    write();
    		  }
    		  function writeTypeAndLength(type, length) {
    		    if (length < 24) {
    		      writeUint8(type << 5 | length);
    		    } else if (length < 0x100) {
    		      writeUint8(type << 5 | 24);
    		      writeUint8(length);
    		    } else if (length < 0x10000) {
    		      writeUint8(type << 5 | 25);
    		      writeUint16(length);
    		    } else if (length < 0x100000000) {
    		      writeUint8(type << 5 | 26);
    		      writeUint32(length);
    		    } else {
    		      writeUint8(type << 5 | 27);
    		      writeUint64(length);
    		    }
    		  }
    		  
    		  function encodeItem(value) {
    		    var i;

    		    if (value === false)
    		      return writeUint8(0xf4);
    		    if (value === true)
    		      return writeUint8(0xf5);
    		    if (value === null)
    		      return writeUint8(0xf6);
    		    if (value === undefined$1)
    		      return writeUint8(0xf7);
    		  
    		    switch (typeof value) {
    		      case "number":
    		        if (Math.floor(value) === value) {
    		          if (0 <= value && value <= POW_2_53)
    		            return writeTypeAndLength(0, value);
    		          if (-POW_2_53 <= value && value < 0)
    		            return writeTypeAndLength(1, -(value + 1));
    		        }
    		        writeUint8(0xfb);
    		        return writeFloat64(value);

    		      case "string":
    		        var utf8data = [];
    		        for (i = 0; i < value.length; ++i) {
    		          var charCode = value.charCodeAt(i);
    		          if (charCode < 0x80) {
    		            utf8data.push(charCode);
    		          } else if (charCode < 0x800) {
    		            utf8data.push(0xc0 | charCode >> 6);
    		            utf8data.push(0x80 | charCode & 0x3f);
    		          } else if (charCode < 0xd800) {
    		            utf8data.push(0xe0 | charCode >> 12);
    		            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
    		            utf8data.push(0x80 | charCode & 0x3f);
    		          } else {
    		            charCode = (charCode & 0x3ff) << 10;
    		            charCode |= value.charCodeAt(++i) & 0x3ff;
    		            charCode += 0x10000;

    		            utf8data.push(0xf0 | charCode >> 18);
    		            utf8data.push(0x80 | (charCode >> 12)  & 0x3f);
    		            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
    		            utf8data.push(0x80 | charCode & 0x3f);
    		          }
    		        }

    		        writeTypeAndLength(3, utf8data.length);
    		        return writeUint8Array(utf8data);

    		      default:
    		        var length;
    		        if (Array.isArray(value)) {
    		          length = value.length;
    		          writeTypeAndLength(4, length);
    		          for (i = 0; i < length; ++i)
    		            encodeItem(value[i]);
    		        } else if (value instanceof Uint8Array) {
    		          writeTypeAndLength(2, value.length);
    		          writeUint8Array(value);
    		        } else {
    		          var keys = Object.keys(value);
    		          length = keys.length;
    		          writeTypeAndLength(5, length);
    		          for (i = 0; i < length; ++i) {
    		            var key = keys[i];
    		            encodeItem(key);
    		            encodeItem(value[key]);
    		          }
    		        }
    		    }
    		  }
    		  
    		  encodeItem(value);

    		  if ("slice" in data)
    		    return data.slice(0, offset);
    		  
    		  var ret = new ArrayBuffer(offset);
    		  var retView = new DataView(ret);
    		  for (var i = 0; i < offset; ++i)
    		    retView.setUint8(i, dataView.getUint8(i));
    		  return ret;
    		}

    		function decode(data, tagger, simpleValue) {
    		  var dataView = new DataView(data);
    		  var offset = 0;
    		  
    		  if (typeof tagger !== "function")
    		    tagger = function(value) { return value; };
    		  if (typeof simpleValue !== "function")
    		    simpleValue = function() { return undefined$1; };

    		  function read(value, length) {
    		    offset += length;
    		    return value;
    		  }
    		  function readArrayBuffer(length) {
    		    return read(new Uint8Array(data, offset, length), length);
    		  }
    		  function readFloat16() {
    		    var tempArrayBuffer = new ArrayBuffer(4);
    		    var tempDataView = new DataView(tempArrayBuffer);
    		    var value = readUint16();

    		    var sign = value & 0x8000;
    		    var exponent = value & 0x7c00;
    		    var fraction = value & 0x03ff;
    		    
    		    if (exponent === 0x7c00)
    		      exponent = 0xff << 10;
    		    else if (exponent !== 0)
    		      exponent += (127 - 15) << 10;
    		    else if (fraction !== 0)
    		      return fraction * POW_2_24;
    		    
    		    tempDataView.setUint32(0, sign << 16 | exponent << 13 | fraction << 13);
    		    return tempDataView.getFloat32(0);
    		  }
    		  function readFloat32() {
    		    return read(dataView.getFloat32(offset), 4);
    		  }
    		  function readFloat64() {
    		    return read(dataView.getFloat64(offset), 8);
    		  }
    		  function readUint8() {
    		    return read(dataView.getUint8(offset), 1);
    		  }
    		  function readUint16() {
    		    return read(dataView.getUint16(offset), 2);
    		  }
    		  function readUint32() {
    		    return read(dataView.getUint32(offset), 4);
    		  }
    		  function readUint64() {
    		    return readUint32() * POW_2_32 + readUint32();
    		  }
    		  function readBreak() {
    		    if (dataView.getUint8(offset) !== 0xff)
    		      return false;
    		    offset += 1;
    		    return true;
    		  }
    		  function readLength(additionalInformation) {
    		    if (additionalInformation < 24)
    		      return additionalInformation;
    		    if (additionalInformation === 24)
    		      return readUint8();
    		    if (additionalInformation === 25)
    		      return readUint16();
    		    if (additionalInformation === 26)
    		      return readUint32();
    		    if (additionalInformation === 27)
    		      return readUint64();
    		    if (additionalInformation === 31)
    		      return -1;
    		    throw "Invalid length encoding";
    		  }
    		  function readIndefiniteStringLength(majorType) {
    		    var initialByte = readUint8();
    		    if (initialByte === 0xff)
    		      return -1;
    		    var length = readLength(initialByte & 0x1f);
    		    if (length < 0 || (initialByte >> 5) !== majorType)
    		      throw "Invalid indefinite length element";
    		    return length;
    		  }

    		  function appendUtf16data(utf16data, length) {
    		    for (var i = 0; i < length; ++i) {
    		      var value = readUint8();
    		      if (value & 0x80) {
    		        if (value < 0xe0) {
    		          value = (value & 0x1f) <<  6
    		                | (readUint8() & 0x3f);
    		          length -= 1;
    		        } else if (value < 0xf0) {
    		          value = (value & 0x0f) << 12
    		                | (readUint8() & 0x3f) << 6
    		                | (readUint8() & 0x3f);
    		          length -= 2;
    		        } else {
    		          value = (value & 0x0f) << 18
    		                | (readUint8() & 0x3f) << 12
    		                | (readUint8() & 0x3f) << 6
    		                | (readUint8() & 0x3f);
    		          length -= 3;
    		        }
    		      }

    		      if (value < 0x10000) {
    		        utf16data.push(value);
    		      } else {
    		        value -= 0x10000;
    		        utf16data.push(0xd800 | (value >> 10));
    		        utf16data.push(0xdc00 | (value & 0x3ff));
    		      }
    		    }
    		  }

    		  function decodeItem() {
    		    var initialByte = readUint8();
    		    var majorType = initialByte >> 5;
    		    var additionalInformation = initialByte & 0x1f;
    		    var i;
    		    var length;

    		    if (majorType === 7) {
    		      switch (additionalInformation) {
    		        case 25:
    		          return readFloat16();
    		        case 26:
    		          return readFloat32();
    		        case 27:
    		          return readFloat64();
    		      }
    		    }

    		    length = readLength(additionalInformation);
    		    if (length < 0 && (majorType < 2 || 6 < majorType))
    		      throw "Invalid length";

    		    switch (majorType) {
    		      case 0:
    		        return length;
    		      case 1:
    		        return -1 - length;
    		      case 2:
    		        if (length < 0) {
    		          var elements = [];
    		          var fullArrayLength = 0;
    		          while ((length = readIndefiniteStringLength(majorType)) >= 0) {
    		            fullArrayLength += length;
    		            elements.push(readArrayBuffer(length));
    		          }
    		          var fullArray = new Uint8Array(fullArrayLength);
    		          var fullArrayOffset = 0;
    		          for (i = 0; i < elements.length; ++i) {
    		            fullArray.set(elements[i], fullArrayOffset);
    		            fullArrayOffset += elements[i].length;
    		          }
    		          return fullArray;
    		        }
    		        return readArrayBuffer(length);
    		      case 3:
    		        var utf16data = [];
    		        if (length < 0) {
    		          while ((length = readIndefiniteStringLength(majorType)) >= 0)
    		            appendUtf16data(utf16data, length);
    		        } else
    		          appendUtf16data(utf16data, length);
    		        return String.fromCharCode.apply(null, utf16data);
    		      case 4:
    		        var retArray;
    		        if (length < 0) {
    		          retArray = [];
    		          while (!readBreak())
    		            retArray.push(decodeItem());
    		        } else {
    		          retArray = new Array(length);
    		          for (i = 0; i < length; ++i)
    		            retArray[i] = decodeItem();
    		        }
    		        return retArray;
    		      case 5:
    		        var retObject = {};
    		        for (i = 0; i < length || length < 0 && !readBreak(); ++i) {
    		          var key = decodeItem();
    		          retObject[key] = decodeItem();
    		        }
    		        return retObject;
    		      case 6:
    		        return tagger(decodeItem(), length);
    		      case 7:
    		        switch (length) {
    		          case 20:
    		            return false;
    		          case 21:
    		            return true;
    		          case 22:
    		            return null;
    		          case 23:
    		            return undefined$1;
    		          default:
    		            return simpleValue(length);
    		        }
    		    }
    		  }

    		  var ret = decodeItem();
    		  if (offset !== data.byteLength)
    		    throw "Remaining bytes";
    		  return ret;
    		}

    		var obj = { encode: encode, decode: decode };

    		if (typeof undefined$1 === "function" && undefined$1.amd)
    		  undefined$1("cbor/cbor", obj);
    		else if (module.exports)
    		  module.exports = obj;
    		else if (!global.CBOR)
    		  global.CBOR = obj;

    		})(commonjsGlobal); 
    	} (cbor));
    	return cbor.exports;
    }

    var cborTypedArrayTags = {exports: {}};

    var hasRequiredCborTypedArrayTags;

    function requireCborTypedArrayTags () {
    	if (hasRequiredCborTypedArrayTags) return cborTypedArrayTags.exports;
    	hasRequiredCborTypedArrayTags = 1;
    	(function (module) {

    		var UPPER32 = Math.pow(2, 32);

    		var warnedPrecision = false;
    		function warnPrecision() {
    		  if (!warnedPrecision) {
    		    warnedPrecision = true;
    		    console.warn('CBOR 64-bit integer array values may lose precision. No further warnings.');
    		  }
    		}

    		/**
    		 * Unpack 64-bit unsigned integer from byte array.
    		 * @param {Uint8Array} bytes
    		*/
    		function decodeUint64LE(bytes) {
    		  warnPrecision();

    		  var byteLen = bytes.byteLength;
    		  var offset = bytes.byteOffset;
    		  var arrLen = byteLen / 8;

    		  var buffer = bytes.buffer.slice(offset, offset + byteLen);
    		  var uint32View = new Uint32Array(buffer);

    		  var arr = new Array(arrLen);
    		  for (var i = 0; i < arrLen; i++) {
    		    var si = i * 2;
    		    var lo = uint32View[si];
    		    var hi = uint32View[si+1];
    		    arr[i] = lo + UPPER32 * hi;
    		  }

    		  return arr;
    		}

    		/**
    		 * Unpack 64-bit signed integer from byte array.
    		 * @param {Uint8Array} bytes
    		*/
    		function decodeInt64LE(bytes) {
    		  warnPrecision();

    		  var byteLen = bytes.byteLength;
    		  var offset = bytes.byteOffset;
    		  var arrLen = byteLen / 8;

    		  var buffer = bytes.buffer.slice(offset, offset + byteLen);
    		  var uint32View = new Uint32Array(buffer);
    		  var int32View = new Int32Array(buffer);

    		  var arr = new Array(arrLen);
    		  for (var i = 0; i < arrLen; i++) {
    		    var si = i * 2;
    		    var lo = uint32View[si];
    		    var hi = int32View[si+1];
    		    arr[i] = lo + UPPER32 * hi;
    		  }

    		  return arr;
    		}

    		/**
    		 * Unpack typed array from byte array.
    		 * @param {Uint8Array} bytes
    		 * @param {type} ArrayType - Desired output array type
    		*/
    		function decodeNativeArray(bytes, ArrayType) {
    		  var byteLen = bytes.byteLength;
    		  var offset = bytes.byteOffset;
    		  var buffer = bytes.buffer.slice(offset, offset + byteLen);
    		  return new ArrayType(buffer);
    		}

    		/**
    		 * Supports a subset of draft CBOR typed array tags:
    		 *     <https://tools.ietf.org/html/draft-ietf-cbor-array-tags-00>
    		 *
    		 * Only supports little-endian tags for now.
    		 */
    		var nativeArrayTypes = {
    		  64: Uint8Array,
    		  69: Uint16Array,
    		  70: Uint32Array,
    		  72: Int8Array,
    		  77: Int16Array,
    		  78: Int32Array,
    		  85: Float32Array,
    		  86: Float64Array
    		};

    		/**
    		 * We can also decode 64-bit integer arrays, since ROS has these types.
    		 */
    		var conversionArrayTypes = {
    		  71: decodeUint64LE,
    		  79: decodeInt64LE
    		};

    		/**
    		 * Handle CBOR typed array tags during decoding.
    		 * @param {Uint8Array} data
    		 * @param {Number} tag
    		 */
    		function cborTypedArrayTagger(data, tag) {
    		  if (tag in nativeArrayTypes) {
    		    var arrayType = nativeArrayTypes[tag];
    		    return decodeNativeArray(data, arrayType);
    		  }
    		  if (tag in conversionArrayTypes) {
    		    return conversionArrayTypes[tag](data);
    		  }
    		  return data;
    		}

    		if (module.exports) {
    		  module.exports = cborTypedArrayTagger;
    		} 
    	} (cborTypedArrayTags));
    	return cborTypedArrayTags.exports;
    }

    /**
     * Socket event handling utilities for handling events on either
     * WebSocket and TCP sockets
     *
     * Note to anyone reviewing this code: these functions are called
     * in the context of their parent object, unless bound
     * @fileOverview
     */

    var SocketAdapter_1;
    var hasRequiredSocketAdapter;

    function requireSocketAdapter () {
    	if (hasRequiredSocketAdapter) return SocketAdapter_1;
    	hasRequiredSocketAdapter = 1;

    	var decompressPng = requireDecompressPng();
    	var CBOR = requireCbor();
    	var typedArrayTagger = requireCborTypedArrayTags();
    	var BSON = null;
    	if(typeof bson !== 'undefined'){
    	    BSON = bson().BSON;
    	}

    	/**
    	 * Event listeners for a WebSocket or TCP socket to a JavaScript
    	 * ROS Client. Sets up Messages for a given topic to trigger an
    	 * event on the ROS client.
    	 *
    	 * @namespace SocketAdapter
    	 * @private
    	 */
    	function SocketAdapter(client) {
    	  var decoder = null;
    	  if (client.transportOptions.decoder) {
    	    decoder = client.transportOptions.decoder;
    	  }

    	  function handleMessage(message) {
    	    if (message.op === 'publish') {
    	      client.emit(message.topic, message.msg);
    	    } else if (message.op === 'service_response') {
    	      client.emit(message.id, message);
    	    } else if (message.op === 'call_service') {
    	      client.emit(message.service, message);
    	    } else if(message.op === 'status'){
    	      if(message.id){
    	        client.emit('status:'+message.id, message);
    	      } else {
    	        client.emit('status', message);
    	      }
    	    }
    	  }

    	  function handlePng(message, callback) {
    	    if (message.op === 'png') {
    	      decompressPng(message.data, callback);
    	    } else {
    	      callback(message);
    	    }
    	  }

    	  function decodeBSON(data, callback) {
    	    if (!BSON) {
    	      throw 'Cannot process BSON encoded message without BSON header.';
    	    }
    	    var reader = new FileReader();
    	    reader.onload  = function() {
    	      var uint8Array = new Uint8Array(this.result);
    	      var msg = BSON.deserialize(uint8Array);
    	      callback(msg);
    	    };
    	    reader.readAsArrayBuffer(data);
    	  }

    	  return {
    	    /**
    	     * Emit a 'connection' event on WebSocket connection.
    	     *
    	     * @param {function} event - The argument to emit with the event.
    	     * @memberof SocketAdapter
    	     */
    	    onopen: function onOpen(event) {
    	      client.isConnected = true;
    	      client.emit('connection', event);
    	    },

    	    /**
    	     * Emit a 'close' event on WebSocket disconnection.
    	     *
    	     * @param {function} event - The argument to emit with the event.
    	     * @memberof SocketAdapter
    	     */
    	    onclose: function onClose(event) {
    	      client.isConnected = false;
    	      client.emit('close', event);
    	    },

    	    /**
    	     * Emit an 'error' event whenever there was an error.
    	     *
    	     * @param {function} event - The argument to emit with the event.
    	     * @memberof SocketAdapter
    	     */
    	    onerror: function onError(event) {
    	      client.emit('error', event);
    	    },

    	    /**
    	     * Parse message responses from rosbridge and send to the appropriate
    	     * topic, service, or param.
    	     *
    	     * @param {Object} data - The raw JSON message from rosbridge.
    	     * @memberof SocketAdapter
    	     */
    	    onmessage: function onMessage(data) {
    	      if (decoder) {
    	        decoder(data.data, function (message) {
    	          handleMessage(message);
    	        });
    	      } else if (typeof Blob !== 'undefined' && data.data instanceof Blob) {
    	        decodeBSON(data.data, function (message) {
    	          handlePng(message, handleMessage);
    	        });
    	      } else if (data.data instanceof ArrayBuffer) {
    	        var decoded = CBOR.decode(data.data, typedArrayTagger);
    	        handleMessage(decoded);
    	      } else {
    	        var message = JSON.parse(typeof data === 'string' ? data : data.data);
    	        handlePng(message, handleMessage);
    	      }
    	    }
    	  };
    	}

    	SocketAdapter_1 = SocketAdapter;
    	return SocketAdapter_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - balexander@willowgarage.com
     */

    var ServiceResponse_1;
    var hasRequiredServiceResponse;

    function requireServiceResponse () {
    	if (hasRequiredServiceResponse) return ServiceResponse_1;
    	hasRequiredServiceResponse = 1;
    	var assign = objectAssign;

    	/**
    	 * A ServiceResponse is returned from the service call.
    	 *
    	 * @constructor
    	 * @param {Object} values - Object matching the fields defined in the .srv definition file.
    	 */
    	function ServiceResponse(values) {
    	  assign(this, values);
    	}

    	ServiceResponse_1 = ServiceResponse;
    	return ServiceResponse_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - balexander@willowgarage.com
     */

    var ServiceRequest_1;
    var hasRequiredServiceRequest;

    function requireServiceRequest () {
    	if (hasRequiredServiceRequest) return ServiceRequest_1;
    	hasRequiredServiceRequest = 1;
    	var assign = objectAssign;

    	/**
    	 * A ServiceRequest is passed into the service call.
    	 *
    	 * @constructor
    	 * @param {Object} values - Object matching the fields defined in the .srv definition file.
    	 */
    	function ServiceRequest(values) {
    	  assign(this, values);
    	}

    	ServiceRequest_1 = ServiceRequest;
    	return ServiceRequest_1;
    }

    var eventemitter2 = {exports: {}};

    /*!
     * EventEmitter2
     * https://github.com/hij1nx/EventEmitter2
     *
     * Copyright (c) 2013 hij1nx
     * Licensed under the MIT license.
     */

    var hasRequiredEventemitter2;

    function requireEventemitter2 () {
    	if (hasRequiredEventemitter2) return eventemitter2.exports;
    	hasRequiredEventemitter2 = 1;
    	(function (module, exports) {
    !function(undefined$1) {
    		  var hasOwnProperty= Object.hasOwnProperty;
    		  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    		    return Object.prototype.toString.call(obj) === "[object Array]";
    		  };
    		  var defaultMaxListeners = 10;
    		  var nextTickSupported= typeof process=='object' && typeof process.nextTick=='function';
    		  var symbolsSupported= typeof Symbol==='function';
    		  var reflectSupported= typeof Reflect === 'object';
    		  var setImmediateSupported= typeof setImmediate === 'function';
    		  var _setImmediate= setImmediateSupported ? setImmediate : setTimeout;
    		  var ownKeys= symbolsSupported? (reflectSupported && typeof Reflect.ownKeys==='function'? Reflect.ownKeys : function(obj){
    		    var arr= Object.getOwnPropertyNames(obj);
    		    arr.push.apply(arr, Object.getOwnPropertySymbols(obj));
    		    return arr;
    		  }) : Object.keys;

    		  function init() {
    		    this._events = {};
    		    if (this._conf) {
    		      configure.call(this, this._conf);
    		    }
    		  }

    		  function configure(conf) {
    		    if (conf) {
    		      this._conf = conf;

    		      conf.delimiter && (this.delimiter = conf.delimiter);

    		      if(conf.maxListeners!==undefined$1){
    		          this._maxListeners= conf.maxListeners;
    		      }

    		      conf.wildcard && (this.wildcard = conf.wildcard);
    		      conf.newListener && (this._newListener = conf.newListener);
    		      conf.removeListener && (this._removeListener = conf.removeListener);
    		      conf.verboseMemoryLeak && (this.verboseMemoryLeak = conf.verboseMemoryLeak);
    		      conf.ignoreErrors && (this.ignoreErrors = conf.ignoreErrors);

    		      if (this.wildcard) {
    		        this.listenerTree = {};
    		      }
    		    }
    		  }

    		  function logPossibleMemoryLeak(count, eventName) {
    		    var errorMsg = '(node) warning: possible EventEmitter memory ' +
    		        'leak detected. ' + count + ' listeners added. ' +
    		        'Use emitter.setMaxListeners() to increase limit.';

    		    if(this.verboseMemoryLeak){
    		      errorMsg += ' Event name: ' + eventName + '.';
    		    }

    		    if(typeof process !== 'undefined' && process.emitWarning){
    		      var e = new Error(errorMsg);
    		      e.name = 'MaxListenersExceededWarning';
    		      e.emitter = this;
    		      e.count = count;
    		      process.emitWarning(e);
    		    } else {
    		      console.error(errorMsg);

    		      if (console.trace){
    		        console.trace();
    		      }
    		    }
    		  }

    		  var toArray = function (a, b, c) {
    		    var n = arguments.length;
    		    switch (n) {
    		      case 0:
    		        return [];
    		      case 1:
    		        return [a];
    		      case 2:
    		        return [a, b];
    		      case 3:
    		        return [a, b, c];
    		      default:
    		        var arr = new Array(n);
    		        while (n--) {
    		          arr[n] = arguments[n];
    		        }
    		        return arr;
    		    }
    		  };

    		  function toObject(keys, values) {
    		    var obj = {};
    		    var key;
    		    var len = keys.length;
    		    var valuesCount = values ? values.length : 0;
    		    for (var i = 0; i < len; i++) {
    		      key = keys[i];
    		      obj[key] = i < valuesCount ? values[i] : undefined$1;
    		    }
    		    return obj;
    		  }

    		  function TargetObserver(emitter, target, options) {
    		    this._emitter = emitter;
    		    this._target = target;
    		    this._listeners = {};
    		    this._listenersCount = 0;

    		    var on, off;

    		    if (options.on || options.off) {
    		      on = options.on;
    		      off = options.off;
    		    }

    		    if (target.addEventListener) {
    		      on = target.addEventListener;
    		      off = target.removeEventListener;
    		    } else if (target.addListener) {
    		      on = target.addListener;
    		      off = target.removeListener;
    		    } else if (target.on) {
    		      on = target.on;
    		      off = target.off;
    		    }

    		    if (!on && !off) {
    		      throw Error('target does not implement any known event API');
    		    }

    		    if (typeof on !== 'function') {
    		      throw TypeError('on method must be a function');
    		    }

    		    if (typeof off !== 'function') {
    		      throw TypeError('off method must be a function');
    		    }

    		    this._on = on;
    		    this._off = off;

    		    var _observers= emitter._observers;
    		    if(_observers){
    		      _observers.push(this);
    		    }else {
    		      emitter._observers= [this];
    		    }
    		  }

    		  Object.assign(TargetObserver.prototype, {
    		    subscribe: function(event, localEvent, reducer){
    		      var observer= this;
    		      var target= this._target;
    		      var emitter= this._emitter;
    		      var listeners= this._listeners;
    		      var handler= function(){
    		        var args= toArray.apply(null, arguments);
    		        var eventObj= {
    		          data: args,
    		          name: localEvent,
    		          original: event
    		        };
    		        if(reducer){
    		          var result= reducer.call(target, eventObj);
    		          if(result!==false){
    		            emitter.emit.apply(emitter, [eventObj.name].concat(args));
    		          }
    		          return;
    		        }
    		        emitter.emit.apply(emitter, [localEvent].concat(args));
    		      };


    		      if(listeners[event]){
    		        throw Error('Event \'' + event + '\' is already listening');
    		      }

    		      this._listenersCount++;

    		      if(emitter._newListener && emitter._removeListener && !observer._onNewListener){

    		        this._onNewListener = function (_event) {
    		          if (_event === localEvent && listeners[event] === null) {
    		            listeners[event] = handler;
    		            observer._on.call(target, event, handler);
    		          }
    		        };

    		        emitter.on('newListener', this._onNewListener);

    		        this._onRemoveListener= function(_event){
    		          if(_event === localEvent && !emitter.hasListeners(_event) && listeners[event]){
    		            listeners[event]= null;
    		            observer._off.call(target, event, handler);
    		          }
    		        };

    		        listeners[event]= null;

    		        emitter.on('removeListener', this._onRemoveListener);
    		      }else {
    		        listeners[event]= handler;
    		        observer._on.call(target, event, handler);
    		      }
    		    },

    		    unsubscribe: function(event){
    		      var observer= this;
    		      var listeners= this._listeners;
    		      var emitter= this._emitter;
    		      var handler;
    		      var events;
    		      var off= this._off;
    		      var target= this._target;
    		      var i;

    		      if(event && typeof event!=='string'){
    		        throw TypeError('event must be a string');
    		      }

    		      function clearRefs(){
    		        if(observer._onNewListener){
    		          emitter.off('newListener', observer._onNewListener);
    		          emitter.off('removeListener', observer._onRemoveListener);
    		          observer._onNewListener= null;
    		          observer._onRemoveListener= null;
    		        }
    		        var index= findTargetIndex.call(emitter, observer);
    		        emitter._observers.splice(index, 1);
    		      }

    		      if(event){
    		        handler= listeners[event];
    		        if(!handler) return;
    		        off.call(target, event, handler);
    		        delete listeners[event];
    		        if(!--this._listenersCount){
    		          clearRefs();
    		        }
    		      }else {
    		        events= ownKeys(listeners);
    		        i= events.length;
    		        while(i-->0){
    		          event= events[i];
    		          off.call(target, event, listeners[event]);
    		        }
    		        this._listeners= {};
    		        this._listenersCount= 0;
    		        clearRefs();
    		      }
    		    }
    		  });

    		  function resolveOptions(options, schema, reducers, allowUnknown) {
    		    var computedOptions = Object.assign({}, schema);

    		    if (!options) return computedOptions;

    		    if (typeof options !== 'object') {
    		      throw TypeError('options must be an object')
    		    }

    		    var keys = Object.keys(options);
    		    var length = keys.length;
    		    var option, value;
    		    var reducer;

    		    function reject(reason) {
    		      throw Error('Invalid "' + option + '" option value' + (reason ? '. Reason: ' + reason : ''))
    		    }

    		    for (var i = 0; i < length; i++) {
    		      option = keys[i];
    		      if (!allowUnknown && !hasOwnProperty.call(schema, option)) {
    		        throw Error('Unknown "' + option + '" option');
    		      }
    		      value = options[option];
    		      if (value !== undefined$1) {
    		        reducer = reducers[option];
    		        computedOptions[option] = reducer ? reducer(value, reject) : value;
    		      }
    		    }
    		    return computedOptions;
    		  }

    		  function constructorReducer(value, reject) {
    		    if (typeof value !== 'function' || !value.hasOwnProperty('prototype')) {
    		      reject('value must be a constructor');
    		    }
    		    return value;
    		  }

    		  function makeTypeReducer(types) {
    		    var message= 'value must be type of ' + types.join('|');
    		    var len= types.length;
    		    var firstType= types[0];
    		    var secondType= types[1];

    		    if (len === 1) {
    		      return function (v, reject) {
    		        if (typeof v === firstType) {
    		          return v;
    		        }
    		        reject(message);
    		      }
    		    }

    		    if (len === 2) {
    		      return function (v, reject) {
    		        var kind= typeof v;
    		        if (kind === firstType || kind === secondType) return v;
    		        reject(message);
    		      }
    		    }

    		    return function (v, reject) {
    		      var kind = typeof v;
    		      var i = len;
    		      while (i-- > 0) {
    		        if (kind === types[i]) return v;
    		      }
    		      reject(message);
    		    }
    		  }

    		  var functionReducer= makeTypeReducer(['function']);

    		  var objectFunctionReducer= makeTypeReducer(['object', 'function']);

    		  function makeCancelablePromise(Promise, executor, options) {
    		    var isCancelable;
    		    var callbacks;
    		    var timer= 0;
    		    var subscriptionClosed;

    		    var promise = new Promise(function (resolve, reject, onCancel) {
    		      options= resolveOptions(options, {
    		        timeout: 0,
    		        overload: false
    		      }, {
    		        timeout: function(value, reject){
    		          value*= 1;
    		          if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
    		            reject('timeout must be a positive number');
    		          }
    		          return value;
    		        }
    		      });

    		      isCancelable = !options.overload && typeof Promise.prototype.cancel === 'function' && typeof onCancel === 'function';

    		      function cleanup() {
    		        if (callbacks) {
    		          callbacks = null;
    		        }
    		        if (timer) {
    		          clearTimeout(timer);
    		          timer = 0;
    		        }
    		      }

    		      var _resolve= function(value){
    		        cleanup();
    		        resolve(value);
    		      };

    		      var _reject= function(err){
    		        cleanup();
    		        reject(err);
    		      };

    		      if (isCancelable) {
    		        executor(_resolve, _reject, onCancel);
    		      } else {
    		        callbacks = [function(reason){
    		          _reject(reason || Error('canceled'));
    		        }];
    		        executor(_resolve, _reject, function (cb) {
    		          if (subscriptionClosed) {
    		            throw Error('Unable to subscribe on cancel event asynchronously')
    		          }
    		          if (typeof cb !== 'function') {
    		            throw TypeError('onCancel callback must be a function');
    		          }
    		          callbacks.push(cb);
    		        });
    		        subscriptionClosed= true;
    		      }

    		      if (options.timeout > 0) {
    		        timer= setTimeout(function(){
    		          var reason= Error('timeout');
    		          reason.code = 'ETIMEDOUT';
    		          timer= 0;
    		          promise.cancel(reason);
    		          reject(reason);
    		        }, options.timeout);
    		      }
    		    });

    		    if (!isCancelable) {
    		      promise.cancel = function (reason) {
    		        if (!callbacks) {
    		          return;
    		        }
    		        var length = callbacks.length;
    		        for (var i = 1; i < length; i++) {
    		          callbacks[i](reason);
    		        }
    		        // internal callback to reject the promise
    		        callbacks[0](reason);
    		        callbacks = null;
    		      };
    		    }

    		    return promise;
    		  }

    		  function findTargetIndex(observer) {
    		    var observers = this._observers;
    		    if(!observers){
    		      return -1;
    		    }
    		    var len = observers.length;
    		    for (var i = 0; i < len; i++) {
    		      if (observers[i]._target === observer) return i;
    		    }
    		    return -1;
    		  }

    		  // Attention, function return type now is array, always !
    		  // It has zero elements if no any matches found and one or more
    		  // elements (leafs) if there are matches
    		  //
    		  function searchListenerTree(handlers, type, tree, i, typeLength) {
    		    if (!tree) {
    		      return null;
    		    }

    		    if (i === 0) {
    		      var kind = typeof type;
    		      if (kind === 'string') {
    		        var ns, n, l = 0, j = 0, delimiter = this.delimiter, dl = delimiter.length;
    		        if ((n = type.indexOf(delimiter)) !== -1) {
    		          ns = new Array(5);
    		          do {
    		            ns[l++] = type.slice(j, n);
    		            j = n + dl;
    		          } while ((n = type.indexOf(delimiter, j)) !== -1);

    		          ns[l++] = type.slice(j);
    		          type = ns;
    		          typeLength = l;
    		        } else {
    		          type = [type];
    		          typeLength = 1;
    		        }
    		      } else if (kind === 'object') {
    		        typeLength = type.length;
    		      } else {
    		        type = [type];
    		        typeLength = 1;
    		      }
    		    }

    		    var listeners= null, branch, xTree, xxTree, isolatedBranch, endReached, currentType = type[i],
    		        nextType = type[i + 1], branches, _listeners;

    		    if (i === typeLength) {
    		      //
    		      // If at the end of the event(s) list and the tree has listeners
    		      // invoke those listeners.
    		      //

    		      if(tree._listeners) {
    		        if (typeof tree._listeners === 'function') {
    		          handlers && handlers.push(tree._listeners);
    		          listeners = [tree];
    		        } else {
    		          handlers && handlers.push.apply(handlers, tree._listeners);
    		          listeners = [tree];
    		        }
    		      }
    		    } else {

    		      if (currentType === '*') {
    		        //
    		        // If the event emitted is '*' at this part
    		        // or there is a concrete match at this patch
    		        //
    		        branches = ownKeys(tree);
    		        n = branches.length;
    		        while (n-- > 0) {
    		          branch = branches[n];
    		          if (branch !== '_listeners') {
    		            _listeners = searchListenerTree(handlers, type, tree[branch], i + 1, typeLength);
    		            if (_listeners) {
    		              if (listeners) {
    		                listeners.push.apply(listeners, _listeners);
    		              } else {
    		                listeners = _listeners;
    		              }
    		            }
    		          }
    		        }
    		        return listeners;
    		      } else if (currentType === '**') {
    		        endReached = (i + 1 === typeLength || (i + 2 === typeLength && nextType === '*'));
    		        if (endReached && tree._listeners) {
    		          // The next element has a _listeners, add it to the handlers.
    		          listeners = searchListenerTree(handlers, type, tree, typeLength, typeLength);
    		        }

    		        branches = ownKeys(tree);
    		        n = branches.length;
    		        while (n-- > 0) {
    		          branch = branches[n];
    		          if (branch !== '_listeners') {
    		            if (branch === '*' || branch === '**') {
    		              if (tree[branch]._listeners && !endReached) {
    		                _listeners = searchListenerTree(handlers, type, tree[branch], typeLength, typeLength);
    		                if (_listeners) {
    		                  if (listeners) {
    		                    listeners.push.apply(listeners, _listeners);
    		                  } else {
    		                    listeners = _listeners;
    		                  }
    		                }
    		              }
    		              _listeners = searchListenerTree(handlers, type, tree[branch], i, typeLength);
    		            } else if (branch === nextType) {
    		              _listeners = searchListenerTree(handlers, type, tree[branch], i + 2, typeLength);
    		            } else {
    		              // No match on this one, shift into the tree but not in the type array.
    		              _listeners = searchListenerTree(handlers, type, tree[branch], i, typeLength);
    		            }
    		            if (_listeners) {
    		              if (listeners) {
    		                listeners.push.apply(listeners, _listeners);
    		              } else {
    		                listeners = _listeners;
    		              }
    		            }
    		          }
    		        }
    		        return listeners;
    		      } else if (tree[currentType]) {
    		        listeners = searchListenerTree(handlers, type, tree[currentType], i + 1, typeLength);
    		      }
    		    }

    		      xTree = tree['*'];
    		    if (xTree) {
    		      //
    		      // If the listener tree will allow any match for this part,
    		      // then recursively explore all branches of the tree
    		      //
    		      searchListenerTree(handlers, type, xTree, i + 1, typeLength);
    		    }

    		    xxTree = tree['**'];
    		    if (xxTree) {
    		      if (i < typeLength) {
    		        if (xxTree._listeners) {
    		          // If we have a listener on a '**', it will catch all, so add its handler.
    		          searchListenerTree(handlers, type, xxTree, typeLength, typeLength);
    		        }

    		        // Build arrays of matching next branches and others.
    		        branches= ownKeys(xxTree);
    		        n= branches.length;
    		        while(n-->0){
    		          branch= branches[n];
    		          if (branch !== '_listeners') {
    		            if (branch === nextType) {
    		              // We know the next element will match, so jump twice.
    		              searchListenerTree(handlers, type, xxTree[branch], i + 2, typeLength);
    		            } else if (branch === currentType) {
    		              // Current node matches, move into the tree.
    		              searchListenerTree(handlers, type, xxTree[branch], i + 1, typeLength);
    		            } else {
    		              isolatedBranch = {};
    		              isolatedBranch[branch] = xxTree[branch];
    		              searchListenerTree(handlers, type, {'**': isolatedBranch}, i + 1, typeLength);
    		            }
    		          }
    		        }
    		      } else if (xxTree._listeners) {
    		        // We have reached the end and still on a '**'
    		        searchListenerTree(handlers, type, xxTree, typeLength, typeLength);
    		      } else if (xxTree['*'] && xxTree['*']._listeners) {
    		        searchListenerTree(handlers, type, xxTree['*'], typeLength, typeLength);
    		      }
    		    }

    		    return listeners;
    		  }

    		  function growListenerTree(type, listener, prepend) {
    		    var len = 0, j = 0, i, delimiter = this.delimiter, dl= delimiter.length, ns;

    		    if(typeof type==='string') {
    		      if ((i = type.indexOf(delimiter)) !== -1) {
    		        ns = new Array(5);
    		        do {
    		          ns[len++] = type.slice(j, i);
    		          j = i + dl;
    		        } while ((i = type.indexOf(delimiter, j)) !== -1);

    		        ns[len++] = type.slice(j);
    		      }else {
    		        ns= [type];
    		        len= 1;
    		      }
    		    }else {
    		      ns= type;
    		      len= type.length;
    		    }

    		    //
    		    // Looks for two consecutive '**', if so, don't add the event at all.
    		    //
    		    if (len > 1) {
    		      for (i = 0; i + 1 < len; i++) {
    		        if (ns[i] === '**' && ns[i + 1] === '**') {
    		          return;
    		        }
    		      }
    		    }



    		    var tree = this.listenerTree, name;

    		    for (i = 0; i < len; i++) {
    		      name = ns[i];

    		      tree = tree[name] || (tree[name] = {});

    		      if (i === len - 1) {
    		        if (!tree._listeners) {
    		          tree._listeners = listener;
    		        } else {
    		          if (typeof tree._listeners === 'function') {
    		            tree._listeners = [tree._listeners];
    		          }

    		          if (prepend) {
    		            tree._listeners.unshift(listener);
    		          } else {
    		            tree._listeners.push(listener);
    		          }

    		          if (
    		              !tree._listeners.warned &&
    		              this._maxListeners > 0 &&
    		              tree._listeners.length > this._maxListeners
    		          ) {
    		            tree._listeners.warned = true;
    		            logPossibleMemoryLeak.call(this, tree._listeners.length, name);
    		          }
    		        }
    		        return true;
    		      }
    		    }

    		    return true;
    		  }

    		  function collectTreeEvents(tree, events, root, asArray){
    		     var branches= ownKeys(tree);
    		     var i= branches.length;
    		     var branch, branchName, path;
    		     var hasListeners= tree['_listeners'];
    		     var isArrayPath;

    		     while(i-->0){
    		         branchName= branches[i];

    		         branch= tree[branchName];

    		         if(branchName==='_listeners'){
    		             path= root;
    		         }else {
    		             path = root ? root.concat(branchName) : [branchName];
    		         }

    		         isArrayPath= asArray || typeof branchName==='symbol';

    		         hasListeners && events.push(isArrayPath? path : path.join(this.delimiter));

    		         if(typeof branch==='object'){
    		             collectTreeEvents.call(this, branch, events, path, isArrayPath);
    		         }
    		     }

    		     return events;
    		  }

    		  function recursivelyGarbageCollect(root) {
    		    var keys = ownKeys(root);
    		    var i= keys.length;
    		    var obj, key, flag;
    		    while(i-->0){
    		      key = keys[i];
    		      obj = root[key];

    		      if(obj){
    		          flag= true;
    		          if(key !== '_listeners' && !recursivelyGarbageCollect(obj)){
    		             delete root[key];
    		          }
    		      }
    		    }

    		    return flag;
    		  }

    		  function Listener(emitter, event, listener){
    		    this.emitter= emitter;
    		    this.event= event;
    		    this.listener= listener;
    		  }

    		  Listener.prototype.off= function(){
    		    this.emitter.off(this.event, this.listener);
    		    return this;
    		  };

    		  function setupListener(event, listener, options){
    		      if (options === true) {
    		        promisify = true;
    		      } else if (options === false) {
    		        async = true;
    		      } else {
    		        if (!options || typeof options !== 'object') {
    		          throw TypeError('options should be an object or true');
    		        }
    		        var async = options.async;
    		        var promisify = options.promisify;
    		        var nextTick = options.nextTick;
    		        var objectify = options.objectify;
    		      }

    		      if (async || nextTick || promisify) {
    		        var _listener = listener;
    		        var _origin = listener._origin || listener;

    		        if (nextTick && !nextTickSupported) {
    		          throw Error('process.nextTick is not supported');
    		        }

    		        if (promisify === undefined$1) {
    		          promisify = listener.constructor.name === 'AsyncFunction';
    		        }

    		        listener = function () {
    		          var args = arguments;
    		          var context = this;
    		          var event = this.event;

    		          return promisify ? (nextTick ? Promise.resolve() : new Promise(function (resolve) {
    		            _setImmediate(resolve);
    		          }).then(function () {
    		            context.event = event;
    		            return _listener.apply(context, args)
    		          })) : (nextTick ? process.nextTick : _setImmediate)(function () {
    		            context.event = event;
    		            _listener.apply(context, args);
    		          });
    		        };

    		        listener._async = true;
    		        listener._origin = _origin;
    		      }

    		    return [listener, objectify? new Listener(this, event, listener): this];
    		  }

    		  function EventEmitter(conf) {
    		    this._events = {};
    		    this._newListener = false;
    		    this._removeListener = false;
    		    this.verboseMemoryLeak = false;
    		    configure.call(this, conf);
    		  }

    		  EventEmitter.EventEmitter2 = EventEmitter; // backwards compatibility for exporting EventEmitter property

    		  EventEmitter.prototype.listenTo= function(target, events, options){
    		    if(typeof target!=='object'){
    		      throw TypeError('target musts be an object');
    		    }

    		    var emitter= this;

    		    options = resolveOptions(options, {
    		      on: undefined$1,
    		      off: undefined$1,
    		      reducers: undefined$1
    		    }, {
    		      on: functionReducer,
    		      off: functionReducer,
    		      reducers: objectFunctionReducer
    		    });

    		    function listen(events){
    		      if(typeof events!=='object'){
    		        throw TypeError('events must be an object');
    		      }

    		      var reducers= options.reducers;
    		      var index= findTargetIndex.call(emitter, target);
    		      var observer;

    		      if(index===-1){
    		        observer= new TargetObserver(emitter, target, options);
    		      }else {
    		        observer= emitter._observers[index];
    		      }

    		      var keys= ownKeys(events);
    		      var len= keys.length;
    		      var event;
    		      var isSingleReducer= typeof reducers==='function';

    		      for(var i=0; i<len; i++){
    		        event= keys[i];
    		        observer.subscribe(
    		            event,
    		            events[event] || event,
    		            isSingleReducer ? reducers : reducers && reducers[event]
    		        );
    		      }
    		    }

    		    isArray(events)?
    		        listen(toObject(events)) :
    		        (typeof events==='string'? listen(toObject(events.split(/\s+/))): listen(events));

    		    return this;
    		  };

    		  EventEmitter.prototype.stopListeningTo = function (target, event) {
    		    var observers = this._observers;

    		    if(!observers){
    		      return false;
    		    }

    		    var i = observers.length;
    		    var observer;
    		    var matched= false;

    		    if(target && typeof target!=='object'){
    		      throw TypeError('target should be an object');
    		    }

    		    while (i-- > 0) {
    		      observer = observers[i];
    		      if (!target || observer._target === target) {
    		        observer.unsubscribe(event);
    		        matched= true;
    		      }
    		    }

    		    return matched;
    		  };

    		  // By default EventEmitters will print a warning if more than
    		  // 10 listeners are added to it. This is a useful default which
    		  // helps finding memory leaks.
    		  //
    		  // Obviously not all Emitters should be limited to 10. This function allows
    		  // that to be increased. Set to zero for unlimited.

    		  EventEmitter.prototype.delimiter = '.';

    		  EventEmitter.prototype.setMaxListeners = function(n) {
    		    if (n !== undefined$1) {
    		      this._maxListeners = n;
    		      if (!this._conf) this._conf = {};
    		      this._conf.maxListeners = n;
    		    }
    		  };

    		  EventEmitter.prototype.getMaxListeners = function() {
    		    return this._maxListeners;
    		  };

    		  EventEmitter.prototype.event = '';

    		  EventEmitter.prototype.once = function(event, fn, options) {
    		    return this._once(event, fn, false, options);
    		  };

    		  EventEmitter.prototype.prependOnceListener = function(event, fn, options) {
    		    return this._once(event, fn, true, options);
    		  };

    		  EventEmitter.prototype._once = function(event, fn, prepend, options) {
    		    return this._many(event, 1, fn, prepend, options);
    		  };

    		  EventEmitter.prototype.many = function(event, ttl, fn, options) {
    		    return this._many(event, ttl, fn, false, options);
    		  };

    		  EventEmitter.prototype.prependMany = function(event, ttl, fn, options) {
    		    return this._many(event, ttl, fn, true, options);
    		  };

    		  EventEmitter.prototype._many = function(event, ttl, fn, prepend, options) {
    		    var self = this;

    		    if (typeof fn !== 'function') {
    		      throw new Error('many only accepts instances of Function');
    		    }

    		    function listener() {
    		      if (--ttl === 0) {
    		        self.off(event, listener);
    		      }
    		      return fn.apply(this, arguments);
    		    }

    		    listener._origin = fn;

    		    return this._on(event, listener, prepend, options);
    		  };

    		  EventEmitter.prototype.emit = function() {
    		    if (!this._events && !this._all) {
    		      return false;
    		    }

    		    this._events || init.call(this);

    		    var type = arguments[0], ns, wildcard= this.wildcard;
    		    var args,l,i,j, containsSymbol;

    		    if (type === 'newListener' && !this._newListener) {
    		      if (!this._events.newListener) {
    		        return false;
    		      }
    		    }

    		    if (wildcard) {
    		      ns= type;
    		      if(type!=='newListener' && type!=='removeListener'){
    		        if (typeof type === 'object') {
    		          l = type.length;
    		          if (symbolsSupported) {
    		            for (i = 0; i < l; i++) {
    		              if (typeof type[i] === 'symbol') {
    		                containsSymbol = true;
    		                break;
    		              }
    		            }
    		          }
    		          if (!containsSymbol) {
    		            type = type.join(this.delimiter);
    		          }
    		        }
    		      }
    		    }

    		    var al = arguments.length;
    		    var handler;

    		    if (this._all && this._all.length) {
    		      handler = this._all.slice();

    		      for (i = 0, l = handler.length; i < l; i++) {
    		        this.event = type;
    		        switch (al) {
    		        case 1:
    		          handler[i].call(this, type);
    		          break;
    		        case 2:
    		          handler[i].call(this, type, arguments[1]);
    		          break;
    		        case 3:
    		          handler[i].call(this, type, arguments[1], arguments[2]);
    		          break;
    		        default:
    		          handler[i].apply(this, arguments);
    		        }
    		      }
    		    }

    		    if (wildcard) {
    		      handler = [];
    		      searchListenerTree.call(this, handler, ns, this.listenerTree, 0, l);
    		    } else {
    		      handler = this._events[type];
    		      if (typeof handler === 'function') {
    		        this.event = type;
    		        switch (al) {
    		        case 1:
    		          handler.call(this);
    		          break;
    		        case 2:
    		          handler.call(this, arguments[1]);
    		          break;
    		        case 3:
    		          handler.call(this, arguments[1], arguments[2]);
    		          break;
    		        default:
    		          args = new Array(al - 1);
    		          for (j = 1; j < al; j++) args[j - 1] = arguments[j];
    		          handler.apply(this, args);
    		        }
    		        return true;
    		      } else if (handler) {
    		        // need to make copy of handlers because list can change in the middle
    		        // of emit call
    		        handler = handler.slice();
    		      }
    		    }

    		    if (handler && handler.length) {
    		      if (al > 3) {
    		        args = new Array(al - 1);
    		        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
    		      }
    		      for (i = 0, l = handler.length; i < l; i++) {
    		        this.event = type;
    		        switch (al) {
    		        case 1:
    		          handler[i].call(this);
    		          break;
    		        case 2:
    		          handler[i].call(this, arguments[1]);
    		          break;
    		        case 3:
    		          handler[i].call(this, arguments[1], arguments[2]);
    		          break;
    		        default:
    		          handler[i].apply(this, args);
    		        }
    		      }
    		      return true;
    		    } else if (!this.ignoreErrors && !this._all && type === 'error') {
    		      if (arguments[1] instanceof Error) {
    		        throw arguments[1]; // Unhandled 'error' event
    		      } else {
    		        throw new Error("Uncaught, unspecified 'error' event.");
    		      }
    		    }

    		    return !!this._all;
    		  };

    		  EventEmitter.prototype.emitAsync = function() {
    		    if (!this._events && !this._all) {
    		      return false;
    		    }

    		    this._events || init.call(this);

    		    var type = arguments[0], wildcard= this.wildcard, ns, containsSymbol;
    		    var args,l,i,j;

    		    if (type === 'newListener' && !this._newListener) {
    		        if (!this._events.newListener) { return Promise.resolve([false]); }
    		    }

    		    if (wildcard) {
    		      ns= type;
    		      if(type!=='newListener' && type!=='removeListener'){
    		        if (typeof type === 'object') {
    		          l = type.length;
    		          if (symbolsSupported) {
    		            for (i = 0; i < l; i++) {
    		              if (typeof type[i] === 'symbol') {
    		                containsSymbol = true;
    		                break;
    		              }
    		            }
    		          }
    		          if (!containsSymbol) {
    		            type = type.join(this.delimiter);
    		          }
    		        }
    		      }
    		    }

    		    var promises= [];

    		    var al = arguments.length;
    		    var handler;

    		    if (this._all) {
    		      for (i = 0, l = this._all.length; i < l; i++) {
    		        this.event = type;
    		        switch (al) {
    		        case 1:
    		          promises.push(this._all[i].call(this, type));
    		          break;
    		        case 2:
    		          promises.push(this._all[i].call(this, type, arguments[1]));
    		          break;
    		        case 3:
    		          promises.push(this._all[i].call(this, type, arguments[1], arguments[2]));
    		          break;
    		        default:
    		          promises.push(this._all[i].apply(this, arguments));
    		        }
    		      }
    		    }

    		    if (wildcard) {
    		      handler = [];
    		      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    		    } else {
    		      handler = this._events[type];
    		    }

    		    if (typeof handler === 'function') {
    		      this.event = type;
    		      switch (al) {
    		      case 1:
    		        promises.push(handler.call(this));
    		        break;
    		      case 2:
    		        promises.push(handler.call(this, arguments[1]));
    		        break;
    		      case 3:
    		        promises.push(handler.call(this, arguments[1], arguments[2]));
    		        break;
    		      default:
    		        args = new Array(al - 1);
    		        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
    		        promises.push(handler.apply(this, args));
    		      }
    		    } else if (handler && handler.length) {
    		      handler = handler.slice();
    		      if (al > 3) {
    		        args = new Array(al - 1);
    		        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
    		      }
    		      for (i = 0, l = handler.length; i < l; i++) {
    		        this.event = type;
    		        switch (al) {
    		        case 1:
    		          promises.push(handler[i].call(this));
    		          break;
    		        case 2:
    		          promises.push(handler[i].call(this, arguments[1]));
    		          break;
    		        case 3:
    		          promises.push(handler[i].call(this, arguments[1], arguments[2]));
    		          break;
    		        default:
    		          promises.push(handler[i].apply(this, args));
    		        }
    		      }
    		    } else if (!this.ignoreErrors && !this._all && type === 'error') {
    		      if (arguments[1] instanceof Error) {
    		        return Promise.reject(arguments[1]); // Unhandled 'error' event
    		      } else {
    		        return Promise.reject("Uncaught, unspecified 'error' event.");
    		      }
    		    }

    		    return Promise.all(promises);
    		  };

    		  EventEmitter.prototype.on = function(type, listener, options) {
    		    return this._on(type, listener, false, options);
    		  };

    		  EventEmitter.prototype.prependListener = function(type, listener, options) {
    		    return this._on(type, listener, true, options);
    		  };

    		  EventEmitter.prototype.onAny = function(fn) {
    		    return this._onAny(fn, false);
    		  };

    		  EventEmitter.prototype.prependAny = function(fn) {
    		    return this._onAny(fn, true);
    		  };

    		  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

    		  EventEmitter.prototype._onAny = function(fn, prepend){
    		    if (typeof fn !== 'function') {
    		      throw new Error('onAny only accepts instances of Function');
    		    }

    		    if (!this._all) {
    		      this._all = [];
    		    }

    		    // Add the function to the event listener collection.
    		    if(prepend){
    		      this._all.unshift(fn);
    		    }else {
    		      this._all.push(fn);
    		    }

    		    return this;
    		  };

    		  EventEmitter.prototype._on = function(type, listener, prepend, options) {
    		    if (typeof type === 'function') {
    		      this._onAny(type, listener);
    		      return this;
    		    }

    		    if (typeof listener !== 'function') {
    		      throw new Error('on only accepts instances of Function');
    		    }
    		    this._events || init.call(this);

    		    var returnValue= this, temp;

    		    if (options !== undefined$1) {
    		      temp = setupListener.call(this, type, listener, options);
    		      listener = temp[0];
    		      returnValue = temp[1];
    		    }

    		    // To avoid recursion in the case that type == "newListeners"! Before
    		    // adding it to the listeners, first emit "newListeners".
    		    if (this._newListener) {
    		      this.emit('newListener', type, listener);
    		    }

    		    if (this.wildcard) {
    		      growListenerTree.call(this, type, listener, prepend);
    		      return returnValue;
    		    }

    		    if (!this._events[type]) {
    		      // Optimize the case of one listener. Don't need the extra array object.
    		      this._events[type] = listener;
    		    } else {
    		      if (typeof this._events[type] === 'function') {
    		        // Change to array.
    		        this._events[type] = [this._events[type]];
    		      }

    		      // If we've already got an array, just add
    		      if(prepend){
    		        this._events[type].unshift(listener);
    		      }else {
    		        this._events[type].push(listener);
    		      }

    		      // Check for listener leak
    		      if (
    		        !this._events[type].warned &&
    		        this._maxListeners > 0 &&
    		        this._events[type].length > this._maxListeners
    		      ) {
    		        this._events[type].warned = true;
    		        logPossibleMemoryLeak.call(this, this._events[type].length, type);
    		      }
    		    }

    		    return returnValue;
    		  };

    		  EventEmitter.prototype.off = function(type, listener) {
    		    if (typeof listener !== 'function') {
    		      throw new Error('removeListener only takes instances of Function');
    		    }

    		    var handlers,leafs=[];

    		    if(this.wildcard) {
    		      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    		      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    		      if(!leafs) return this;
    		    } else {
    		      // does not use listeners(), so no side effect of creating _events[type]
    		      if (!this._events[type]) return this;
    		      handlers = this._events[type];
    		      leafs.push({_listeners:handlers});
    		    }

    		    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
    		      var leaf = leafs[iLeaf];
    		      handlers = leaf._listeners;
    		      if (isArray(handlers)) {

    		        var position = -1;

    		        for (var i = 0, length = handlers.length; i < length; i++) {
    		          if (handlers[i] === listener ||
    		            (handlers[i].listener && handlers[i].listener === listener) ||
    		            (handlers[i]._origin && handlers[i]._origin === listener)) {
    		            position = i;
    		            break;
    		          }
    		        }

    		        if (position < 0) {
    		          continue;
    		        }

    		        if(this.wildcard) {
    		          leaf._listeners.splice(position, 1);
    		        }
    		        else {
    		          this._events[type].splice(position, 1);
    		        }

    		        if (handlers.length === 0) {
    		          if(this.wildcard) {
    		            delete leaf._listeners;
    		          }
    		          else {
    		            delete this._events[type];
    		          }
    		        }
    		        if (this._removeListener)
    		          this.emit("removeListener", type, listener);

    		        return this;
    		      }
    		      else if (handlers === listener ||
    		        (handlers.listener && handlers.listener === listener) ||
    		        (handlers._origin && handlers._origin === listener)) {
    		        if(this.wildcard) {
    		          delete leaf._listeners;
    		        }
    		        else {
    		          delete this._events[type];
    		        }
    		        if (this._removeListener)
    		          this.emit("removeListener", type, listener);
    		      }
    		    }

    		    this.listenerTree && recursivelyGarbageCollect(this.listenerTree);

    		    return this;
    		  };

    		  EventEmitter.prototype.offAny = function(fn) {
    		    var i = 0, l = 0, fns;
    		    if (fn && this._all && this._all.length > 0) {
    		      fns = this._all;
    		      for(i = 0, l = fns.length; i < l; i++) {
    		        if(fn === fns[i]) {
    		          fns.splice(i, 1);
    		          if (this._removeListener)
    		            this.emit("removeListenerAny", fn);
    		          return this;
    		        }
    		      }
    		    } else {
    		      fns = this._all;
    		      if (this._removeListener) {
    		        for(i = 0, l = fns.length; i < l; i++)
    		          this.emit("removeListenerAny", fns[i]);
    		      }
    		      this._all = [];
    		    }
    		    return this;
    		  };

    		  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

    		  EventEmitter.prototype.removeAllListeners = function (type) {
    		    if (type === undefined$1) {
    		      !this._events || init.call(this);
    		      return this;
    		    }

    		    if (this.wildcard) {
    		      var leafs = searchListenerTree.call(this, null, type, this.listenerTree, 0), leaf, i;
    		      if (!leafs) return this;
    		      for (i = 0; i < leafs.length; i++) {
    		        leaf = leafs[i];
    		        leaf._listeners = null;
    		      }
    		      this.listenerTree && recursivelyGarbageCollect(this.listenerTree);
    		    } else if (this._events) {
    		      this._events[type] = null;
    		    }
    		    return this;
    		  };

    		  EventEmitter.prototype.listeners = function (type) {
    		    var _events = this._events;
    		    var keys, listeners, allListeners;
    		    var i;
    		    var listenerTree;

    		    if (type === undefined$1) {
    		      if (this.wildcard) {
    		        throw Error('event name required for wildcard emitter');
    		      }

    		      if (!_events) {
    		        return [];
    		      }

    		      keys = ownKeys(_events);
    		      i = keys.length;
    		      allListeners = [];
    		      while (i-- > 0) {
    		        listeners = _events[keys[i]];
    		        if (typeof listeners === 'function') {
    		          allListeners.push(listeners);
    		        } else {
    		          allListeners.push.apply(allListeners, listeners);
    		        }
    		      }
    		      return allListeners;
    		    } else {
    		      if (this.wildcard) {
    		        listenerTree= this.listenerTree;
    		        if(!listenerTree) return [];
    		        var handlers = [];
    		        var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    		        searchListenerTree.call(this, handlers, ns, listenerTree, 0);
    		        return handlers;
    		      }

    		      if (!_events) {
    		        return [];
    		      }

    		      listeners = _events[type];

    		      if (!listeners) {
    		        return [];
    		      }
    		      return typeof listeners === 'function' ? [listeners] : listeners;
    		    }
    		  };

    		  EventEmitter.prototype.eventNames = function(nsAsArray){
    		    var _events= this._events;
    		    return this.wildcard? collectTreeEvents.call(this, this.listenerTree, [], null, nsAsArray) : (_events? ownKeys(_events) : []);
    		  };

    		  EventEmitter.prototype.listenerCount = function(type) {
    		    return this.listeners(type).length;
    		  };

    		  EventEmitter.prototype.hasListeners = function (type) {
    		    if (this.wildcard) {
    		      var handlers = [];
    		      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    		      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
    		      return handlers.length > 0;
    		    }

    		    var _events = this._events;
    		    var _all = this._all;

    		    return !!(_all && _all.length || _events && (type === undefined$1 ? ownKeys(_events).length : _events[type]));
    		  };

    		  EventEmitter.prototype.listenersAny = function() {

    		    if(this._all) {
    		      return this._all;
    		    }
    		    else {
    		      return [];
    		    }

    		  };

    		  EventEmitter.prototype.waitFor = function (event, options) {
    		    var self = this;
    		    var type = typeof options;
    		    if (type === 'number') {
    		      options = {timeout: options};
    		    } else if (type === 'function') {
    		      options = {filter: options};
    		    }

    		    options= resolveOptions(options, {
    		      timeout: 0,
    		      filter: undefined$1,
    		      handleError: false,
    		      Promise: Promise,
    		      overload: false
    		    }, {
    		      filter: functionReducer,
    		      Promise: constructorReducer
    		    });

    		    return makeCancelablePromise(options.Promise, function (resolve, reject, onCancel) {
    		      function listener() {
    		        var filter= options.filter;
    		        if (filter && !filter.apply(self, arguments)) {
    		          return;
    		        }
    		        self.off(event, listener);
    		        if (options.handleError) {
    		          var err = arguments[0];
    		          err ? reject(err) : resolve(toArray.apply(null, arguments).slice(1));
    		        } else {
    		          resolve(toArray.apply(null, arguments));
    		        }
    		      }

    		      onCancel(function(){
    		        self.off(event, listener);
    		      });

    		      self._on(event, listener, false);
    		    }, {
    		      timeout: options.timeout,
    		      overload: options.overload
    		    })
    		  };

    		  function once(emitter, name, options) {
    		    options= resolveOptions(options, {
    		      Promise: Promise,
    		      timeout: 0,
    		      overload: false
    		    }, {
    		      Promise: constructorReducer
    		    });

    		    var _Promise= options.Promise;

    		    return makeCancelablePromise(_Promise, function(resolve, reject, onCancel){
    		      var handler;
    		      if (typeof emitter.addEventListener === 'function') {
    		        handler=  function () {
    		          resolve(toArray.apply(null, arguments));
    		        };

    		        onCancel(function(){
    		          emitter.removeEventListener(name, handler);
    		        });

    		        emitter.addEventListener(
    		            name,
    		            handler,
    		            {once: true}
    		        );
    		        return;
    		      }

    		      var eventListener = function(){
    		        errorListener && emitter.removeListener('error', errorListener);
    		        resolve(toArray.apply(null, arguments));
    		      };

    		      var errorListener;

    		      if (name !== 'error') {
    		        errorListener = function (err){
    		          emitter.removeListener(name, eventListener);
    		          reject(err);
    		        };

    		        emitter.once('error', errorListener);
    		      }

    		      onCancel(function(){
    		        errorListener && emitter.removeListener('error', errorListener);
    		        emitter.removeListener(name, eventListener);
    		      });

    		      emitter.once(name, eventListener);
    		    }, {
    		      timeout: options.timeout,
    		      overload: options.overload
    		    });
    		  }

    		  var prototype= EventEmitter.prototype;

    		  Object.defineProperties(EventEmitter, {
    		    defaultMaxListeners: {
    		      get: function () {
    		        return prototype._maxListeners;
    		      },
    		      set: function (n) {
    		        if (typeof n !== 'number' || n < 0 || Number.isNaN(n)) {
    		          throw TypeError('n must be a non-negative number')
    		        }
    		        prototype._maxListeners = n;
    		      },
    		      enumerable: true
    		    },
    		    once: {
    		      value: once,
    		      writable: true,
    		      configurable: true
    		    }
    		  });

    		  Object.defineProperties(prototype, {
    		      _maxListeners: {
    		          value: defaultMaxListeners,
    		          writable: true,
    		          configurable: true
    		      },
    		      _observers: {value: null, writable: true, configurable: true}
    		  });

    		  if (typeof undefined$1 === 'function' && undefined$1.amd) {
    		     // AMD. Register as an anonymous module.
    		    undefined$1(function() {
    		      return EventEmitter;
    		    });
    		  } else {
    		    // CommonJS
    		    module.exports = EventEmitter;
    		  }
    		}(); 
    	} (eventemitter2));
    	return eventemitter2.exports;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - baalexander@gmail.com
     */

    var Service_1;
    var hasRequiredService;

    function requireService () {
    	if (hasRequiredService) return Service_1;
    	hasRequiredService = 1;
    	var ServiceResponse = requireServiceResponse();
    	requireServiceRequest();
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * A ROS service client.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.name - The service name, like '/add_two_ints'.
    	 * @param {string} options.serviceType - The service type, like 'rospy_tutorials/AddTwoInts'.
    	 */
    	function Service(options) {
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.name = options.name;
    	  this.serviceType = options.serviceType;
    	  this.isAdvertised = false;

    	  this._serviceCallback = null;
    	}
    	Service.prototype.__proto__ = EventEmitter2.prototype;
    	/**
    	 * Call the service. Returns the service response in the
    	 * callback. Does nothing if this service is currently advertised.
    	 *
    	 * @param {ServiceRequest} request - The ROSLIB.ServiceRequest to send.
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.response - The response from the service request.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Service.prototype.callService = function(request, callback, failedCallback) {
    	  if (this.isAdvertised) {
    	    return;
    	  }

    	  var serviceCallId = 'call_service:' + this.name + ':' + (++this.ros.idCounter);

    	  if (callback || failedCallback) {
    	    this.ros.once(serviceCallId, function(message) {
    	      if (message.result !== undefined && message.result === false) {
    	        if (typeof failedCallback === 'function') {
    	          failedCallback(message.values);
    	        }
    	      } else if (typeof callback === 'function') {
    	        callback(new ServiceResponse(message.values));
    	      }
    	    });
    	  }

    	  var call = {
    	    op : 'call_service',
    	    id : serviceCallId,
    	    service : this.name,
    	    type: this.serviceType,
    	    args : request
    	  };
    	  this.ros.callOnConnection(call);
    	};

    	/**
    	 * Advertise the service. This turns the Service object from a client
    	 * into a server. The callback will be called with every request
    	 * that's made on this service.
    	 *
    	 * @param {function} callback - This works similarly to the callback for a C++ service and should take the following params:
    	 * @param {ServiceRequest} callback.request - The service request.
    	 * @param {Object} callback.response - An empty dictionary. Take care not to overwrite this. Instead, only modify the values within.
    	 *     It should return true if the service has finished successfully,
    	 *     i.e., without any fatal errors.
    	 */
    	Service.prototype.advertise = function(callback) {
    	  if (this.isAdvertised || typeof callback !== 'function') {
    	    return;
    	  }

    	  this._serviceCallback = callback;
    	  this.ros.on(this.name, this._serviceResponse.bind(this));
    	  this.ros.callOnConnection({
    	    op: 'advertise_service',
    	    type: this.serviceType,
    	    service: this.name
    	  });
    	  this.isAdvertised = true;
    	};

    	Service.prototype.unadvertise = function() {
    	  if (!this.isAdvertised) {
    	    return;
    	  }
    	  this.ros.callOnConnection({
    	    op: 'unadvertise_service',
    	    service: this.name
    	  });
    	  this.isAdvertised = false;
    	};

    	Service.prototype._serviceResponse = function(rosbridgeRequest) {
    	  var response = {};
    	  var success = this._serviceCallback(rosbridgeRequest.args, response);

    	  var call = {
    	    op: 'service_response',
    	    service: this.name,
    	    values: new ServiceResponse(response),
    	    result: success
    	  };

    	  if (rosbridgeRequest.id) {
    	    call.id = rosbridgeRequest.id;
    	  }

    	  this.ros.callOnConnection(call);
    	};

    	Service_1 = Service;
    	return Service_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - baalexander@gmail.com
     */

    var Ros_1;
    var hasRequiredRos;

    function requireRos () {
    	if (hasRequiredRos) return Ros_1;
    	hasRequiredRos = 1;
    	var WebSocket = requireWebSocket();
    	var WorkerSocket = requireWorkerSocket();
    	var socketAdapter = requireSocketAdapter();

    	var Service = requireService();
    	var ServiceRequest = requireServiceRequest();

    	var assign = objectAssign;
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * Manages connection to the server and all interactions with ROS.
    	 *
    	 * Emits the following events:
    	 *  * 'error' - There was an error with ROS.
    	 *  * 'connection' - Connected to the WebSocket server.
    	 *  * 'close' - Disconnected to the WebSocket server.
    	 *  * &#60;topicName&#62; - A message came from rosbridge with the given topic name.
    	 *  * &#60;serviceID&#62; - A service response came from rosbridge with the given ID.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {string} [options.url] - The WebSocket URL for rosbridge or the node server URL to connect using socket.io (if socket.io exists in the page). Can be specified later with `connect`.
    	 * @param {boolean} [options.groovyCompatibility=true] - Don't use interfaces that changed after the last groovy release or rosbridge_suite and related tools.
    	 * @param {string} [options.transportLibrary=websocket] - One of 'websocket', 'workersocket', 'socket.io' or RTCPeerConnection instance controlling how the connection is created in `connect`.
    	 * @param {Object} [options.transportOptions={}] - The options to use when creating a connection. Currently only used if `transportLibrary` is RTCPeerConnection.
    	 */
    	function Ros(options) {
    	  options = options || {};
    	  var that = this;
    	  this.socket = null;
    	  this.idCounter = 0;
    	  this.isConnected = false;
    	  this.transportLibrary = options.transportLibrary || 'websocket';
    	  this.transportOptions = options.transportOptions || {};
    	  this._sendFunc = function(msg) { that.sendEncodedMessage(msg); };

    	  if (typeof options.groovyCompatibility === 'undefined') {
    	    this.groovyCompatibility = true;
    	  }
    	  else {
    	    this.groovyCompatibility = options.groovyCompatibility;
    	  }

    	  // Sets unlimited event listeners.
    	  this.setMaxListeners(0);

    	  // begin by checking if a URL was given
    	  if (options.url) {
    	    this.connect(options.url);
    	  }
    	}

    	Ros.prototype.__proto__ = EventEmitter2.prototype;

    	/**
    	 * Connect to the specified WebSocket.
    	 *
    	 * @param {string} url - WebSocket URL or RTCDataChannel label for rosbridge.
    	 */
    	Ros.prototype.connect = function(url) {
    	  if (this.transportLibrary === 'socket.io') {
    	    this.socket = assign(io(url, {'force new connection': true}), socketAdapter(this));
    	    this.socket.on('connect', this.socket.onopen);
    	    this.socket.on('data', this.socket.onmessage);
    	    this.socket.on('close', this.socket.onclose);
    	    this.socket.on('error', this.socket.onerror);
    	  } else if (this.transportLibrary.constructor.name === 'RTCPeerConnection') {
    	    this.socket = assign(this.transportLibrary.createDataChannel(url, this.transportOptions), socketAdapter(this));
    	  } else if (this.transportLibrary === 'websocket') {
    	    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
    	      var sock = new WebSocket(url);
    	      sock.binaryType = 'arraybuffer';
    	      this.socket = assign(sock, socketAdapter(this));
    	    }
    	  } else if (this.transportLibrary === 'workersocket') {
    	    this.socket = assign(new WorkerSocket(url), socketAdapter(this));
    	  } else {
    	    throw 'Unknown transportLibrary: ' + this.transportLibrary.toString();
    	  }

    	};

    	/**
    	 * Disconnect from the WebSocket server.
    	 */
    	Ros.prototype.close = function() {
    	  if (this.socket) {
    	    this.socket.close();
    	  }
    	};

    	/**
    	 * Send an authorization request to the server.
    	 *
    	 * @param {string} mac - MAC (hash) string given by the trusted source.
    	 * @param {string} client - IP of the client.
    	 * @param {string} dest - IP of the destination.
    	 * @param {string} rand - Random string given by the trusted source.
    	 * @param {Object} t - Time of the authorization request.
    	 * @param {string} level - User level as a string given by the client.
    	 * @param {Object} end - End time of the client's session.
    	 */
    	Ros.prototype.authenticate = function(mac, client, dest, rand, t, level, end) {
    	  // create the request
    	  var auth = {
    	    op : 'auth',
    	    mac : mac,
    	    client : client,
    	    dest : dest,
    	    rand : rand,
    	    t : t,
    	    level : level,
    	    end : end
    	  };
    	  // send the request
    	  this.callOnConnection(auth);
    	};

    	/**
    	 * Send an encoded message over the WebSocket.
    	 *
    	 * @param {Object} messageEncoded - The encoded message to be sent.
    	 */
    	Ros.prototype.sendEncodedMessage = function(messageEncoded) {
    	  var emitter = null;
    	  var that = this;
    	  if (this.transportLibrary === 'socket.io') {
    	    emitter = function(msg){that.socket.emit('operation', msg);};
    	  } else {
    	    emitter = function(msg){that.socket.send(msg);};
    	  }

    	  if (!this.isConnected) {
    	    that.once('connection', function() {
    	      emitter(messageEncoded);
    	    });
    	  } else {
    	    emitter(messageEncoded);
    	  }
    	};

    	/**
    	 * Send the message over the WebSocket, but queue the message up if not yet
    	 * connected.
    	 *
    	 * @param {Object} message - The message to be sent.
    	 */
    	Ros.prototype.callOnConnection = function(message) {
    	  if (this.transportOptions.encoder) {
    	    this.transportOptions.encoder(message, this._sendFunc);
    	  } else {
    	    this._sendFunc(JSON.stringify(message));
    	  }
    	};

    	/**
    	 * Send a set_level request to the server.
    	 *
    	 * @param {string} level - Status level (none, error, warning, info).
    	 * @param {number} [id] - Operation ID to change status level on.
    	 */
    	Ros.prototype.setStatusLevel = function(level, id){
    	  var levelMsg = {
    	    op: 'set_level',
    	    level: level,
    	    id: id
    	  };

    	  this.callOnConnection(levelMsg);
    	};

    	/**
    	 * Retrieve a list of action servers in ROS as an array of string.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.actionservers - Array of action server names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getActionServers = function(callback, failedCallback) {
    	  var getActionServers = new Service({
    	    ros : this,
    	    name : '/rosapi/action_servers',
    	    serviceType : 'rosapi/GetActionServers'
    	  });

    	  var request = new ServiceRequest({});
    	  if (typeof failedCallback === 'function'){
    	    getActionServers.callService(request,
    	      function(result) {
    	        callback(result.action_servers);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    getActionServers.callService(request, function(result) {
    	      callback(result.action_servers);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of topics in ROS as an array.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.result - The result object with the following params:
    	 * @param {string[]} callback.result.topics - Array of topic names.
    	 * @param {string[]} callback.result.types - Array of message type names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getTopics = function(callback, failedCallback) {
    	  var topicsClient = new Service({
    	    ros : this,
    	    name : '/rosapi/topics',
    	    serviceType : 'rosapi/Topics'
    	  });

    	  var request = new ServiceRequest();
    	  if (typeof failedCallback === 'function'){
    	    topicsClient.callService(request,
    	      function(result) {
    	        callback(result);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    topicsClient.callService(request, function(result) {
    	      callback(result);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of topics in ROS as an array of a specific type.
    	 *
    	 * @param {string} topicType - The topic type to find.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.topics - Array of topic names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getTopicsForType = function(topicType, callback, failedCallback) {
    	  var topicsForTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/topics_for_type',
    	    serviceType : 'rosapi/TopicsForType'
    	  });

    	  var request = new ServiceRequest({
    	    type: topicType
    	  });
    	  if (typeof failedCallback === 'function'){
    	    topicsForTypeClient.callService(request,
    	      function(result) {
    	        callback(result.topics);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    topicsForTypeClient.callService(request, function(result) {
    	      callback(result.topics);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of active service names in ROS.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.services - Array of service names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getServices = function(callback, failedCallback) {
    	  var servicesClient = new Service({
    	    ros : this,
    	    name : '/rosapi/services',
    	    serviceType : 'rosapi/Services'
    	  });

    	  var request = new ServiceRequest();
    	  if (typeof failedCallback === 'function'){
    	    servicesClient.callService(request,
    	      function(result) {
    	        callback(result.services);
    	      },
    	      function(message) {
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    servicesClient.callService(request, function(result) {
    	      callback(result.services);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of services in ROS as an array as specific type.
    	 *
    	 * @param {string} serviceType - The service type to find.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.topics - Array of service names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getServicesForType = function(serviceType, callback, failedCallback) {
    	  var servicesForTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/services_for_type',
    	    serviceType : 'rosapi/ServicesForType'
    	  });

    	  var request = new ServiceRequest({
    	    type: serviceType
    	  });
    	  if (typeof failedCallback === 'function'){
    	    servicesForTypeClient.callService(request,
    	      function(result) {
    	        callback(result.services);
    	      },
    	      function(message) {
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    servicesForTypeClient.callService(request, function(result) {
    	      callback(result.services);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve the details of a ROS service request.
    	 *
    	 * @param {string} type - The type of the service.
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.result - The result object with the following params:
    	 * @param {string[]} callback.result.typedefs - An array containing the details of the service request.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getServiceRequestDetails = function(type, callback, failedCallback) {
    	  var serviceTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/service_request_details',
    	    serviceType : 'rosapi/ServiceRequestDetails'
    	  });
    	  var request = new ServiceRequest({
    	    type: type
    	  });

    	  if (typeof failedCallback === 'function'){
    	    serviceTypeClient.callService(request,
    	      function(result) {
    	        callback(result);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    serviceTypeClient.callService(request, function(result) {
    	      callback(result);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve the details of a ROS service response.
    	 *
    	 * @param {string} type - The type of the service.
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.result - The result object with the following params:
    	 * @param {string[]} callback.result.typedefs - An array containing the details of the service response.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getServiceResponseDetails = function(type, callback, failedCallback) {
    	  var serviceTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/service_response_details',
    	    serviceType : 'rosapi/ServiceResponseDetails'
    	  });
    	  var request = new ServiceRequest({
    	    type: type
    	  });

    	  if (typeof failedCallback === 'function'){
    	    serviceTypeClient.callService(request,
    	      function(result) {
    	        callback(result);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    serviceTypeClient.callService(request, function(result) {
    	      callback(result);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of active node names in ROS.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.nodes - Array of node names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getNodes = function(callback, failedCallback) {
    	  var nodesClient = new Service({
    	    ros : this,
    	    name : '/rosapi/nodes',
    	    serviceType : 'rosapi/Nodes'
    	  });

    	  var request = new ServiceRequest();
    	  if (typeof failedCallback === 'function'){
    	    nodesClient.callService(request,
    	      function(result) {
    	        callback(result.nodes);
    	      },
    	      function(message) {
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    nodesClient.callService(request, function(result) {
    	      callback(result.nodes);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of subscribed topics, publishing topics and services of a specific node.
    	 * <br>
    	 * These are the parameters if failedCallback is <strong>defined</strong>.
    	 *
    	 * @param {string} node - Name of the node.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.subscriptions - Array of subscribed topic names.
    	 * @param {string[]} callback.publications - Array of published topic names.
    	 * @param {string[]} callback.services - Array of service names hosted.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 *
    	 * @also
    	 *
    	 * Retrieve a list of subscribed topics, publishing topics and services of a specific node.
    	 * <br>
    	 * These are the parameters if failedCallback is <strong>undefined</strong>.
    	 *
    	 * @param {string} node - Name of the node.
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.result - The result object with the following params:
    	 * @param {string[]} callback.result.subscribing - Array of subscribed topic names.
    	 * @param {string[]} callback.result.publishing - Array of published topic names.
    	 * @param {string[]} callback.result.services - Array of service names hosted.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getNodeDetails = function(node, callback, failedCallback) {
    	  var nodesClient = new Service({
    	    ros : this,
    	    name : '/rosapi/node_details',
    	    serviceType : 'rosapi/NodeDetails'
    	  });

    	  var request = new ServiceRequest({
    	    node: node
    	  });
    	  if (typeof failedCallback === 'function'){
    	    nodesClient.callService(request,
    	      function(result) {
    	        callback(result.subscribing, result.publishing, result.services);
    	      },
    	      function(message) {
    	        failedCallback(message);
    	      }
    	    );
    	  } else {
    	    nodesClient.callService(request, function(result) {
    	      callback(result);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve a list of parameter names from the ROS Parameter Server.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {string[]} callback.params - Array of param names.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getParams = function(callback, failedCallback) {
    	  var paramsClient = new Service({
    	    ros : this,
    	    name : '/rosapi/get_param_names',
    	    serviceType : 'rosapi/GetParamNames'
    	  });
    	  var request = new ServiceRequest();
    	  if (typeof failedCallback === 'function'){
    	    paramsClient.callService(request,
    	      function(result) {
    	        callback(result.names);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    paramsClient.callService(request, function(result) {
    	      callback(result.names);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve the type of a ROS topic.
    	 *
    	 * @param {string} topic - Name of the topic.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string} callback.type - The type of the topic.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getTopicType = function(topic, callback, failedCallback) {
    	  var topicTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/topic_type',
    	    serviceType : 'rosapi/TopicType'
    	  });
    	  var request = new ServiceRequest({
    	    topic: topic
    	  });

    	  if (typeof failedCallback === 'function'){
    	    topicTypeClient.callService(request,
    	      function(result) {
    	        callback(result.type);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    topicTypeClient.callService(request, function(result) {
    	      callback(result.type);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve the type of a ROS service.
    	 *
    	 * @param {string} service - Name of the service.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string} callback.type - The type of the service.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getServiceType = function(service, callback, failedCallback) {
    	  var serviceTypeClient = new Service({
    	    ros : this,
    	    name : '/rosapi/service_type',
    	    serviceType : 'rosapi/ServiceType'
    	  });
    	  var request = new ServiceRequest({
    	    service: service
    	  });

    	  if (typeof failedCallback === 'function'){
    	    serviceTypeClient.callService(request,
    	      function(result) {
    	        callback(result.type);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    serviceTypeClient.callService(request, function(result) {
    	      callback(result.type);
    	    });
    	  }
    	};

    	/**
    	 * Retrieve the details of a ROS message.
    	 *
    	 * @param {string} message - The name of the message type.
    	 * @param {function} callback - Function with the following params:
    	 * @param {string} callback.details - An array of the message details.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getMessageDetails = function(message, callback, failedCallback) {
    	  var messageDetailClient = new Service({
    	    ros : this,
    	    name : '/rosapi/message_details',
    	    serviceType : 'rosapi/MessageDetails'
    	  });
    	  var request = new ServiceRequest({
    	    type: message
    	  });

    	  if (typeof failedCallback === 'function'){
    	    messageDetailClient.callService(request,
    	      function(result) {
    	        callback(result.typedefs);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    messageDetailClient.callService(request, function(result) {
    	      callback(result.typedefs);
    	    });
    	  }
    	};

    	/**
    	 * Decode a typedef array into a dictionary like `rosmsg show foo/bar`.
    	 *
    	 * @param {Object[]} defs - Array of type_def dictionary.
    	 */
    	Ros.prototype.decodeTypeDefs = function(defs) {
    	  var that = this;

    	  var decodeTypeDefsRec = function(theType, hints) {
    	    // calls itself recursively to resolve type definition using hints.
    	    var typeDefDict = {};
    	    for (var i = 0; i < theType.fieldnames.length; i++) {
    	      var arrayLen = theType.fieldarraylen[i];
    	      var fieldName = theType.fieldnames[i];
    	      var fieldType = theType.fieldtypes[i];
    	      if (fieldType.indexOf('/') === -1) { // check the fieldType includes '/' or not
    	        if (arrayLen === -1) {
    	          typeDefDict[fieldName] = fieldType;
    	        }
    	        else {
    	          typeDefDict[fieldName] = [fieldType];
    	        }
    	      }
    	      else {
    	        // lookup the name
    	        var sub = false;
    	        for (var j = 0; j < hints.length; j++) {
    	          if (hints[j].type.toString() === fieldType.toString()) {
    	            sub = hints[j];
    	            break;
    	          }
    	        }
    	        if (sub) {
    	          var subResult = decodeTypeDefsRec(sub, hints);
    	          if (arrayLen === -1) {
    	            typeDefDict[fieldName] = subResult; // add this decoding result to dictionary
    	          }
    	          else {
    	            typeDefDict[fieldName] = [subResult];
    	          }
    	        }
    	        else {
    	          that.emit('error', 'Cannot find ' + fieldType + ' in decodeTypeDefs');
    	        }
    	      }
    	    }
    	    return typeDefDict;
    	  };

    	  return decodeTypeDefsRec(defs[0], defs);
    	};

    	/**
    	 * Retrieve a list of topics and their associated type definitions.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.result - The result object with the following params:
    	 * @param {string[]} callback.result.topics - Array of topic names.
    	 * @param {string[]} callback.result.types - Array of message type names.
    	 * @param {string[]} callback.result.typedefs_full_text - Array of full definitions of message types, similar to `gendeps --cat`.
    	 * @param {function} [failedCallback] - The callback function when the service call failed with params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Ros.prototype.getTopicsAndRawTypes = function(callback, failedCallback) {
    	  var topicsAndRawTypesClient = new Service({
    	    ros : this,
    	    name : '/rosapi/topics_and_raw_types',
    	    serviceType : 'rosapi/TopicsAndRawTypes'
    	  });

    	  var request = new ServiceRequest();
    	  if (typeof failedCallback === 'function'){
    	    topicsAndRawTypesClient.callService(request,
    	      function(result) {
    	        callback(result);
    	      },
    	      function(message){
    	        failedCallback(message);
    	      }
    	    );
    	  }else {
    	    topicsAndRawTypesClient.callService(request, function(result) {
    	      callback(result);
    	    });
    	  }
    	};


    	Ros_1 = Ros;
    	return Ros_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - baalexander@gmail.com
     */

    var Message_1;
    var hasRequiredMessage;

    function requireMessage () {
    	if (hasRequiredMessage) return Message_1;
    	hasRequiredMessage = 1;
    	var assign = objectAssign;

    	/**
    	 * Message objects are used for publishing and subscribing to and from topics.
    	 *
    	 * @constructor
    	 * @param {Object} values - An object matching the fields defined in the .msg definition file.
    	 */
    	function Message(values) {
    	  assign(this, values);
    	}

    	Message_1 = Message;
    	return Message_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - baalexander@gmail.com
     */

    var Topic_1;
    var hasRequiredTopic;

    function requireTopic () {
    	if (hasRequiredTopic) return Topic_1;
    	hasRequiredTopic = 1;
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;
    	var Message = requireMessage();

    	/**
    	 * Publish and/or subscribe to a topic in ROS.
    	 *
    	 * Emits the following events:
    	 *  * 'warning' - If there are any warning during the Topic creation.
    	 *  * 'message' - The message data from rosbridge.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.name - The topic name, like '/cmd_vel'.
    	 * @param {string} options.messageType - The message type, like 'std_msgs/String'.
    	 * @param {string} [options.compression=none] - The type of compression to use, like 'png', 'cbor', or 'cbor-raw'.
    	 * @param {number} [options.throttle_rate=0] - The rate (in ms in between messages) at which to throttle the topics.
    	 * @param {number} [options.queue_size=100] - The queue created at bridge side for re-publishing webtopics.
    	 * @param {boolean} [options.latch=false] - Latch the topic when publishing.
    	 * @param {number} [options.queue_length=0] - The queue length at bridge side used when subscribing.
    	 * @param {boolean} [options.reconnect_on_close=true] - The flag to enable resubscription and readvertisement on close event.
    	 */
    	function Topic(options) {
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.name = options.name;
    	  this.messageType = options.messageType;
    	  this.isAdvertised = false;
    	  this.compression = options.compression || 'none';
    	  this.throttle_rate = options.throttle_rate || 0;
    	  this.latch = options.latch || false;
    	  this.queue_size = options.queue_size || 100;
    	  this.queue_length = options.queue_length || 0;
    	  this.reconnect_on_close = options.reconnect_on_close !== undefined ? options.reconnect_on_close : true;

    	  // Check for valid compression types
    	  if (this.compression && this.compression !== 'png' &&
    	    this.compression !== 'cbor' && this.compression !== 'cbor-raw' &&
    	    this.compression !== 'none') {
    	    this.emit('warning', this.compression +
    	      ' compression is not supported. No compression will be used.');
    	    this.compression = 'none';
    	  }

    	  // Check if throttle rate is negative
    	  if (this.throttle_rate < 0) {
    	    this.emit('warning', this.throttle_rate + ' is not allowed. Set to 0');
    	    this.throttle_rate = 0;
    	  }

    	  var that = this;
    	  if (this.reconnect_on_close) {
    	    this.callForSubscribeAndAdvertise = function(message) {
    	      that.ros.callOnConnection(message);

    	      that.waitForReconnect = false;
    	      that.reconnectFunc = function() {
    	        if(!that.waitForReconnect) {
    	          that.waitForReconnect = true;
    	          that.ros.callOnConnection(message);
    	          that.ros.once('connection', function() {
    	            that.waitForReconnect = false;
    	          });
    	        }
    	      };
    	      that.ros.on('close', that.reconnectFunc);
    	    };
    	  }
    	  else {
    	    this.callForSubscribeAndAdvertise = this.ros.callOnConnection;
    	  }

    	  this._messageCallback = function(data) {
    	    that.emit('message', new Message(data));
    	  };
    	}
    	Topic.prototype.__proto__ = EventEmitter2.prototype;

    	/**
    	 * Every time a message is published for the given topic, the callback
    	 * will be called with the message object.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.message - The published message.
    	 */
    	Topic.prototype.subscribe = function(callback) {
    	  if (typeof callback === 'function') {
    	    this.on('message', callback);
    	  }

    	  if (this.subscribeId) { return; }
    	  this.ros.on(this.name, this._messageCallback);
    	  this.subscribeId = 'subscribe:' + this.name + ':' + (++this.ros.idCounter);

    	  this.callForSubscribeAndAdvertise({
    	    op: 'subscribe',
    	    id: this.subscribeId,
    	    type: this.messageType,
    	    topic: this.name,
    	    compression: this.compression,
    	    throttle_rate: this.throttle_rate,
    	    queue_length: this.queue_length
    	  });
    	};

    	/**
    	 * Unregister as a subscriber for the topic. Unsubscribing will stop
    	 * and remove all subscribe callbacks. To remove a callback, you must
    	 * explicitly pass the callback function in.
    	 *
    	 * @param {function} [callback] - The callback to unregister, if
    	 *     provided and other listeners are registered the topic won't
    	 *     unsubscribe, just stop emitting to the passed listener.
    	 */
    	Topic.prototype.unsubscribe = function(callback) {
    	  if (callback) {
    	    this.off('message', callback);
    	    // If there is any other callbacks still subscribed don't unsubscribe
    	    if (this.listeners('message').length) { return; }
    	  }
    	  if (!this.subscribeId) { return; }
    	  // Note: Don't call this.removeAllListeners, allow client to handle that themselves
    	  this.ros.off(this.name, this._messageCallback);
    	  if(this.reconnect_on_close) {
    	    this.ros.off('close', this.reconnectFunc);
    	  }
    	  this.emit('unsubscribe');
    	  this.ros.callOnConnection({
    	    op: 'unsubscribe',
    	    id: this.subscribeId,
    	    topic: this.name
    	  });
    	  this.subscribeId = null;
    	};


    	/**
    	 * Register as a publisher for the topic.
    	 */
    	Topic.prototype.advertise = function() {
    	  if (this.isAdvertised) {
    	    return;
    	  }
    	  this.advertiseId = 'advertise:' + this.name + ':' + (++this.ros.idCounter);
    	  this.callForSubscribeAndAdvertise({
    	    op: 'advertise',
    	    id: this.advertiseId,
    	    type: this.messageType,
    	    topic: this.name,
    	    latch: this.latch,
    	    queue_size: this.queue_size
    	  });
    	  this.isAdvertised = true;

    	  if(!this.reconnect_on_close) {
    	    var that = this;
    	    this.ros.on('close', function() {
    	      that.isAdvertised = false;
    	    });
    	  }
    	};

    	/**
    	 * Unregister as a publisher for the topic.
    	 */
    	Topic.prototype.unadvertise = function() {
    	  if (!this.isAdvertised) {
    	    return;
    	  }
    	  if(this.reconnect_on_close) {
    	    this.ros.off('close', this.reconnectFunc);
    	  }
    	  this.emit('unadvertise');
    	  this.ros.callOnConnection({
    	    op: 'unadvertise',
    	    id: this.advertiseId,
    	    topic: this.name
    	  });
    	  this.isAdvertised = false;
    	};

    	/**
    	 * Publish the message.
    	 *
    	 * @param {Message} message - A ROSLIB.Message object.
    	 */
    	Topic.prototype.publish = function(message) {
    	  if (!this.isAdvertised) {
    	    this.advertise();
    	  }

    	  this.ros.idCounter++;
    	  var call = {
    	    op: 'publish',
    	    id: 'publish:' + this.name + ':' + this.ros.idCounter,
    	    topic: this.name,
    	    msg: message,
    	    latch: this.latch
    	  };
    	  this.ros.callOnConnection(call);
    	};

    	Topic_1 = Topic;
    	return Topic_1;
    }

    /**
     * @fileOverview
     * @author Brandon Alexander - baalexander@gmail.com
     */

    var Param_1;
    var hasRequiredParam;

    function requireParam () {
    	if (hasRequiredParam) return Param_1;
    	hasRequiredParam = 1;
    	var Service = requireService();
    	var ServiceRequest = requireServiceRequest();

    	/**
    	 * A ROS parameter.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.name - The param name, like max_vel_x.
    	 */
    	function Param(options) {
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.name = options.name;
    	}

    	/**
    	 * Fetch the value of the param.
    	 *
    	 * @param {function} callback - Function with the following params:
    	 * @param {Object} callback.value - The value of the param from ROS.
    	 * @param {function} [failedCallback] - Function when the service call failed with the following params:
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Param.prototype.get = function(callback, failedCallback) {
    	  var paramClient = new Service({
    	    ros : this.ros,
    	    name : '/rosapi/get_param',
    	    serviceType : 'rosapi/GetParam'
    	  });

    	  var request = new ServiceRequest({
    	    name : this.name
    	  });

    	  paramClient.callService(request, function(result) {
    	    var value = JSON.parse(result.value);
    	    callback(value);
    	  }, failedCallback);
    	};

    	/**
    	 * Set the value of the param in ROS.
    	 *
    	 * @param {Object} value - The value to set param to.
    	 * @param {function} [callback] - The callback function.
    	 * @param {function} [failedCallback] - The callback function when the service call failed.
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Param.prototype.set = function(value, callback, failedCallback) {
    	  var paramClient = new Service({
    	    ros : this.ros,
    	    name : '/rosapi/set_param',
    	    serviceType : 'rosapi/SetParam'
    	  });

    	  var request = new ServiceRequest({
    	    name : this.name,
    	    value : JSON.stringify(value)
    	  });

    	  paramClient.callService(request, callback, failedCallback);
    	};

    	/**
    	 * Delete this parameter on the ROS server.
    	 *
    	 * @param {function} [callback] - The callback function when the service call succeeded.
    	 * @param {function} [failedCallback] - The callback function when the service call failed.
    	 * @param {string} failedCallback.error - The error message reported by ROS.
    	 */
    	Param.prototype.delete = function(callback, failedCallback) {
    	  var paramClient = new Service({
    	    ros : this.ros,
    	    name : '/rosapi/delete_param',
    	    serviceType : 'rosapi/DeleteParam'
    	  });

    	  var request = new ServiceRequest({
    	    name : this.name
    	  });

    	  paramClient.callService(request, callback, failedCallback);
    	};

    	Param_1 = Param;
    	return Param_1;
    }

    var hasRequiredCore;

    function requireCore () {
    	if (hasRequiredCore) return core.exports;
    	hasRequiredCore = 1;
    	var mixin = requireMixin();

    	var core$1 = core.exports = {
    	    Ros: requireRos(),
    	    Topic: requireTopic(),
    	    Message: requireMessage(),
    	    Param: requireParam(),
    	    Service: requireService(),
    	    ServiceRequest: requireServiceRequest(),
    	    ServiceResponse: requireServiceResponse()
    	};

    	mixin(core$1.Ros, ['Param', 'Service', 'Topic'], core$1);
    	return core.exports;
    }

    var actionlib = {exports: {}};

    /**
     * @fileOverview
     * @author Russell Toris - rctoris@wpi.edu
     */

    var ActionClient_1;
    var hasRequiredActionClient;

    function requireActionClient () {
    	if (hasRequiredActionClient) return ActionClient_1;
    	hasRequiredActionClient = 1;
    	var Topic = requireTopic();
    	var Message = requireMessage();
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * An actionlib action client.
    	 *
    	 * Emits the following events:
    	 *  * 'timeout' - If a timeout occurred while sending a goal.
    	 *  * 'status' - The status messages received from the action server.
    	 *  * 'feedback' - The feedback messages received from the action server.
    	 *  * 'result' - The result returned from the action server.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.serverName - The action server name, like '/fibonacci'.
    	 * @param {string} options.actionName - The action message name, like 'actionlib_tutorials/FibonacciAction'.
    	 * @param {number} [options.timeout] - The timeout length when connecting to the action server.
    	 * @param {boolean} [options.omitFeedback] - The flag to indicate whether to omit the feedback channel or not.
    	 * @param {boolean} [options.omitStatus] - The flag to indicate whether to omit the status channel or not.
    	 * @param {boolean} [options.omitResult] - The flag to indicate whether to omit the result channel or not.
    	 */
    	function ActionClient(options) {
    	  var that = this;
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.serverName = options.serverName;
    	  this.actionName = options.actionName;
    	  this.timeout = options.timeout;
    	  this.omitFeedback = options.omitFeedback;
    	  this.omitStatus = options.omitStatus;
    	  this.omitResult = options.omitResult;
    	  this.goals = {};

    	  // flag to check if a status has been received
    	  var receivedStatus = false;

    	  // create the topics associated with actionlib
    	  this.feedbackListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/feedback',
    	    messageType : this.actionName + 'Feedback'
    	  });

    	  this.statusListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/status',
    	    messageType : 'actionlib_msgs/GoalStatusArray'
    	  });

    	  this.resultListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/result',
    	    messageType : this.actionName + 'Result'
    	  });

    	  this.goalTopic = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/goal',
    	    messageType : this.actionName + 'Goal'
    	  });

    	  this.cancelTopic = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/cancel',
    	    messageType : 'actionlib_msgs/GoalID'
    	  });

    	  // advertise the goal and cancel topics
    	  this.goalTopic.advertise();
    	  this.cancelTopic.advertise();

    	  // subscribe to the status topic
    	  if (!this.omitStatus) {
    	    this.statusListener.subscribe(function(statusMessage) {
    	      receivedStatus = true;
    	      statusMessage.status_list.forEach(function(status) {
    	        var goal = that.goals[status.goal_id.id];
    	        if (goal) {
    	          goal.emit('status', status);
    	        }
    	      });
    	    });
    	  }

    	  // subscribe the the feedback topic
    	  if (!this.omitFeedback) {
    	    this.feedbackListener.subscribe(function(feedbackMessage) {
    	      var goal = that.goals[feedbackMessage.status.goal_id.id];
    	      if (goal) {
    	        goal.emit('status', feedbackMessage.status);
    	        goal.emit('feedback', feedbackMessage.feedback);
    	      }
    	    });
    	  }

    	  // subscribe to the result topic
    	  if (!this.omitResult) {
    	    this.resultListener.subscribe(function(resultMessage) {
    	      var goal = that.goals[resultMessage.status.goal_id.id];

    	      if (goal) {
    	        goal.emit('status', resultMessage.status);
    	        goal.emit('result', resultMessage.result);
    	      }
    	    });
    	  }

    	  // If timeout specified, emit a 'timeout' event if the action server does not respond
    	  if (this.timeout) {
    	    setTimeout(function() {
    	      if (!receivedStatus) {
    	        that.emit('timeout');
    	      }
    	    }, this.timeout);
    	  }
    	}

    	ActionClient.prototype.__proto__ = EventEmitter2.prototype;

    	/**
    	 * Cancel all goals associated with this ActionClient.
    	 */
    	ActionClient.prototype.cancel = function() {
    	  var cancelMessage = new Message();
    	  this.cancelTopic.publish(cancelMessage);
    	};

    	/**
    	 * Unsubscribe and unadvertise all topics associated with this ActionClient.
    	 */
    	ActionClient.prototype.dispose = function() {
    	  this.goalTopic.unadvertise();
    	  this.cancelTopic.unadvertise();
    	  if (!this.omitStatus) {this.statusListener.unsubscribe();}
    	  if (!this.omitFeedback) {this.feedbackListener.unsubscribe();}
    	  if (!this.omitResult) {this.resultListener.unsubscribe();}
    	};

    	ActionClient_1 = ActionClient;
    	return ActionClient_1;
    }

    /**
     * @fileOverview
     * @author Justin Young - justin@oodar.com.au
     * @author Russell Toris - rctoris@wpi.edu
     */

    var ActionListener_1;
    var hasRequiredActionListener;

    function requireActionListener () {
    	if (hasRequiredActionListener) return ActionListener_1;
    	hasRequiredActionListener = 1;
    	var Topic = requireTopic();
    	requireMessage();
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * An actionlib action listener.
    	 *
    	 * Emits the following events:
    	 *  * 'status' - The status messages received from the action server.
    	 *  * 'feedback' - The feedback messages received from the action server.
    	 *  * 'result' - The result returned from the action server.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.serverName - The action server name, like '/fibonacci'.
    	 * @param {string} options.actionName - The action message name, like 'actionlib_tutorials/FibonacciAction'.
    	 */
    	function ActionListener(options) {
    	  var that = this;
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.serverName = options.serverName;
    	  this.actionName = options.actionName;


    	  // create the topics associated with actionlib
    	  var goalListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/goal',
    	    messageType : this.actionName + 'Goal'
    	  });

    	  var feedbackListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/feedback',
    	    messageType : this.actionName + 'Feedback'
    	  });

    	  var statusListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/status',
    	    messageType : 'actionlib_msgs/GoalStatusArray'
    	  });

    	  var resultListener = new Topic({
    	    ros : this.ros,
    	    name : this.serverName + '/result',
    	    messageType : this.actionName + 'Result'
    	  });

    	  goalListener.subscribe(function(goalMessage) {
    	      that.emit('goal', goalMessage);
    	  });

    	  statusListener.subscribe(function(statusMessage) {
    	      statusMessage.status_list.forEach(function(status) {
    	          that.emit('status', status);
    	      });
    	  });

    	  feedbackListener.subscribe(function(feedbackMessage) {
    	      that.emit('status', feedbackMessage.status);
    	      that.emit('feedback', feedbackMessage.feedback);
    	  });

    	  // subscribe to the result topic
    	  resultListener.subscribe(function(resultMessage) {
    	      that.emit('status', resultMessage.status);
    	      that.emit('result', resultMessage.result);
    	  });

    	}

    	ActionListener.prototype.__proto__ = EventEmitter2.prototype;

    	ActionListener_1 = ActionListener;
    	return ActionListener_1;
    }

    /**
     * @fileOverview
     * @author Russell Toris - rctoris@wpi.edu
     */

    var Goal_1;
    var hasRequiredGoal;

    function requireGoal () {
    	if (hasRequiredGoal) return Goal_1;
    	hasRequiredGoal = 1;
    	var Message = requireMessage();
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * An actionlib goal that is associated with an action server.
    	 *
    	 * Emits the following events:
    	 *  * 'timeout' - If a timeout occurred while sending a goal.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {ActionClient} options.actionClient - The ROSLIB.ActionClient to use with this goal.
    	 * @param {Object} options.goalMessage - The JSON object containing the goal for the action server.
    	 */
    	function Goal(options) {
    	  var that = this;
    	  this.actionClient = options.actionClient;
    	  this.goalMessage = options.goalMessage;
    	  this.isFinished = false;

    	  // Used to create random IDs
    	  var date = new Date();

    	  // Create a random ID
    	  this.goalID = 'goal_' + Math.random() + '_' + date.getTime();
    	  // Fill in the goal message
    	  this.goalMessage = new Message({
    	    goal_id : {
    	      stamp : {
    	        secs : 0,
    	        nsecs : 0
    	      },
    	      id : this.goalID
    	    },
    	    goal : this.goalMessage
    	  });

    	  this.on('status', function(status) {
    	    that.status = status;
    	  });

    	  this.on('result', function(result) {
    	    that.isFinished = true;
    	    that.result = result;
    	  });

    	  this.on('feedback', function(feedback) {
    	    that.feedback = feedback;
    	  });

    	  // Add the goal
    	  this.actionClient.goals[this.goalID] = this;
    	}

    	Goal.prototype.__proto__ = EventEmitter2.prototype;

    	/**
    	 * Send the goal to the action server.
    	 *
    	 * @param {number} [timeout] - A timeout length for the goal's result.
    	 */
    	Goal.prototype.send = function(timeout) {
    	  var that = this;
    	  that.actionClient.goalTopic.publish(that.goalMessage);
    	  if (timeout) {
    	    setTimeout(function() {
    	      if (!that.isFinished) {
    	        that.emit('timeout');
    	      }
    	    }, timeout);
    	  }
    	};

    	/**
    	 * Cancel the current goal.
    	 */
    	Goal.prototype.cancel = function() {
    	  var cancelMessage = new Message({
    	    id : this.goalID
    	  });
    	  this.actionClient.cancelTopic.publish(cancelMessage);
    	};

    	Goal_1 = Goal;
    	return Goal_1;
    }

    /**
     * @fileOverview
     * @author Laura Lindzey - lindzey@gmail.com
     */

    var SimpleActionServer_1;
    var hasRequiredSimpleActionServer;

    function requireSimpleActionServer () {
    	if (hasRequiredSimpleActionServer) return SimpleActionServer_1;
    	hasRequiredSimpleActionServer = 1;
    	var Topic = requireTopic();
    	var Message = requireMessage();
    	var EventEmitter2 = requireEventemitter2().EventEmitter2;

    	/**
    	 * An actionlib action server client.
    	 *
    	 * Emits the following events:
    	 *  * 'goal' - Goal sent by action client.
    	 *  * 'cancel' - Action client has canceled the request.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} options.serverName - The action server name, like '/fibonacci'.
    	 * @param {string} options.actionName - The action message name, like 'actionlib_tutorials/FibonacciAction'.
    	 */
    	function SimpleActionServer(options) {
    	    var that = this;
    	    options = options || {};
    	    this.ros = options.ros;
    	    this.serverName = options.serverName;
    	    this.actionName = options.actionName;

    	    // create and advertise publishers
    	    this.feedbackPublisher = new Topic({
    	        ros : this.ros,
    	        name : this.serverName + '/feedback',
    	        messageType : this.actionName + 'Feedback'
    	    });
    	    this.feedbackPublisher.advertise();

    	    var statusPublisher = new Topic({
    	        ros : this.ros,
    	        name : this.serverName + '/status',
    	        messageType : 'actionlib_msgs/GoalStatusArray'
    	    });
    	    statusPublisher.advertise();

    	    this.resultPublisher = new Topic({
    	        ros : this.ros,
    	        name : this.serverName + '/result',
    	        messageType : this.actionName + 'Result'
    	    });
    	    this.resultPublisher.advertise();

    	    // create and subscribe to listeners
    	    var goalListener = new Topic({
    	        ros : this.ros,
    	        name : this.serverName + '/goal',
    	        messageType : this.actionName + 'Goal'
    	    });

    	    var cancelListener = new Topic({
    	        ros : this.ros,
    	        name : this.serverName + '/cancel',
    	        messageType : 'actionlib_msgs/GoalID'
    	    });

    	    // Track the goals and their status in order to publish status...
    	    this.statusMessage = new Message({
    	        header : {
    	            stamp : {secs : 0, nsecs : 100},
    	            frame_id : ''
    	        },
    	        status_list : []
    	    });

    	    // needed for handling preemption prompted by a new goal being received
    	    this.currentGoal = null; // currently tracked goal
    	    this.nextGoal = null; // the one that'll be preempting

    	    goalListener.subscribe(function(goalMessage) {

    	    if(that.currentGoal) {
    	            that.nextGoal = goalMessage;
    	            // needs to happen AFTER rest is set up
    	            that.emit('cancel');
    	    } else {
    	            that.statusMessage.status_list = [{goal_id : goalMessage.goal_id, status : 1}];
    	            that.currentGoal = goalMessage;
    	            that.emit('goal', goalMessage.goal);
    	    }
    	    });

    	    // helper function to determine ordering of timestamps
    	    // returns t1 < t2
    	    var isEarlier = function(t1, t2) {
    	        if(t1.secs > t2.secs) {
    	            return false;
    	        } else if(t1.secs < t2.secs) {
    	            return true;
    	        } else if(t1.nsecs < t2.nsecs) {
    	            return true;
    	        } else {
    	            return false;
    	        }
    	    };

    	    // TODO: this may be more complicated than necessary, since I'm
    	    // not sure if the callbacks can ever wind up with a scenario
    	    // where we've been preempted by a next goal, it hasn't finished
    	    // processing, and then we get a cancel message
    	    cancelListener.subscribe(function(cancelMessage) {

    	        // cancel ALL goals if both empty
    	        if(cancelMessage.stamp.secs === 0 && cancelMessage.stamp.secs === 0 && cancelMessage.id === '') {
    	            that.nextGoal = null;
    	            if(that.currentGoal) {
    	                that.emit('cancel');
    	            }
    	        } else { // treat id and stamp independently
    	            if(that.currentGoal && cancelMessage.id === that.currentGoal.goal_id.id) {
    	                that.emit('cancel');
    	            } else if(that.nextGoal && cancelMessage.id === that.nextGoal.goal_id.id) {
    	                that.nextGoal = null;
    	            }

    	            if(that.nextGoal && isEarlier(that.nextGoal.goal_id.stamp,
    	                                          cancelMessage.stamp)) {
    	                that.nextGoal = null;
    	            }
    	            if(that.currentGoal && isEarlier(that.currentGoal.goal_id.stamp,
    	                                             cancelMessage.stamp)) {
    	                that.emit('cancel');
    	            }
    	        }
    	    });

    	    // publish status at pseudo-fixed rate; required for clients to know they've connected
    	    setInterval( function() {
    	        var currentTime = new Date();
    	        var secs = Math.floor(currentTime.getTime()/1000);
    	        var nsecs = Math.round(1000000000*(currentTime.getTime()/1000-secs));
    	        that.statusMessage.header.stamp.secs = secs;
    	        that.statusMessage.header.stamp.nsecs = nsecs;
    	        statusPublisher.publish(that.statusMessage);
    	    }, 500); // publish every 500ms

    	}

    	SimpleActionServer.prototype.__proto__ = EventEmitter2.prototype;

    	/**
    	 * Set action state to succeeded and return to client.
    	 *
    	 * @param {Object} result - The result to return to the client.
    	 */
    	SimpleActionServer.prototype.setSucceeded = function(result) {
    	    var resultMessage = new Message({
    	        status : {goal_id : this.currentGoal.goal_id, status : 3},
    	        result : result
    	    });
    	    this.resultPublisher.publish(resultMessage);

    	    this.statusMessage.status_list = [];
    	    if(this.nextGoal) {
    	        this.currentGoal = this.nextGoal;
    	        this.nextGoal = null;
    	        this.emit('goal', this.currentGoal.goal);
    	    } else {
    	        this.currentGoal = null;
    	    }
    	};

    	/**
    	 * Set action state to aborted and return to client.
    	 *
    	 * @param {Object} result - The result to return to the client.
    	 */
    	SimpleActionServer.prototype.setAborted = function(result) {
    	    var resultMessage = new Message({
    	        status : {goal_id : this.currentGoal.goal_id, status : 4},
    	        result : result
    	    });
    	    this.resultPublisher.publish(resultMessage);

    	    this.statusMessage.status_list = [];
    	    if(this.nextGoal) {
    	        this.currentGoal = this.nextGoal;
    	        this.nextGoal = null;
    	        this.emit('goal', this.currentGoal.goal);
    	    } else {
    	        this.currentGoal = null;
    	    }
    	};

    	/**
    	 * Send a feedback message.
    	 *
    	 * @param {Object} feedback - The feedback to send to the client.
    	 */
    	SimpleActionServer.prototype.sendFeedback = function(feedback) {
    	    var feedbackMessage = new Message({
    	        status : {goal_id : this.currentGoal.goal_id, status : 1},
    	        feedback : feedback
    	    });
    	    this.feedbackPublisher.publish(feedbackMessage);
    	};

    	/**
    	 * Handle case where client requests preemption.
    	 */
    	SimpleActionServer.prototype.setPreempted = function() {
    	    this.statusMessage.status_list = [];
    	    var resultMessage = new Message({
    	        status : {goal_id : this.currentGoal.goal_id, status : 2},
    	    });
    	    this.resultPublisher.publish(resultMessage);

    	    if(this.nextGoal) {
    	        this.currentGoal = this.nextGoal;
    	        this.nextGoal = null;
    	        this.emit('goal', this.currentGoal.goal);
    	    } else {
    	        this.currentGoal = null;
    	    }
    	};

    	SimpleActionServer_1 = SimpleActionServer;
    	return SimpleActionServer_1;
    }

    var hasRequiredActionlib;

    function requireActionlib () {
    	if (hasRequiredActionlib) return actionlib.exports;
    	hasRequiredActionlib = 1;
    	var Ros = requireRos();
    	var mixin = requireMixin();

    	var action = actionlib.exports = {
    	    ActionClient: requireActionClient(),
    	    ActionListener: requireActionListener(),
    	    Goal: requireGoal(),
    	    SimpleActionServer: requireSimpleActionServer()
    	};

    	mixin(Ros, ['ActionClient', 'SimpleActionServer'], action);
    	return actionlib.exports;
    }

    /**
     * @fileOverview
     * @author David Gossow - dgossow@willowgarage.com
     */

    var Vector3_1;
    var hasRequiredVector3;

    function requireVector3 () {
    	if (hasRequiredVector3) return Vector3_1;
    	hasRequiredVector3 = 1;
    	/**
    	 * A 3D vector.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {number} [options.x=0] - The x value.
    	 * @param {number} [options.y=0] - The y value.
    	 * @param {number} [options.z=0] - The z value.
    	 */
    	function Vector3(options) {
    	  options = options || {};
    	  this.x = options.x || 0;
    	  this.y = options.y || 0;
    	  this.z = options.z || 0;
    	}

    	/**
    	 * Set the values of this vector to the sum of itself and the given vector.
    	 *
    	 * @param {Vector3} v - The vector to add with.
    	 */
    	Vector3.prototype.add = function(v) {
    	  this.x += v.x;
    	  this.y += v.y;
    	  this.z += v.z;
    	};

    	/**
    	 * Set the values of this vector to the difference of itself and the given vector.
    	 *
    	 * @param {Vector3} v - The vector to subtract with.
    	 */
    	Vector3.prototype.subtract = function(v) {
    	  this.x -= v.x;
    	  this.y -= v.y;
    	  this.z -= v.z;
    	};

    	/**
    	 * Multiply the given Quaternion with this vector.
    	 *
    	 * @param {Quaternion} q - The quaternion to multiply with.
    	 */
    	Vector3.prototype.multiplyQuaternion = function(q) {
    	  var ix = q.w * this.x + q.y * this.z - q.z * this.y;
    	  var iy = q.w * this.y + q.z * this.x - q.x * this.z;
    	  var iz = q.w * this.z + q.x * this.y - q.y * this.x;
    	  var iw = -q.x * this.x - q.y * this.y - q.z * this.z;
    	  this.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
    	  this.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
    	  this.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
    	};

    	/**
    	 * Clone a copy of this vector.
    	 *
    	 * @returns {Vector3} The cloned vector.
    	 */
    	Vector3.prototype.clone = function() {
    	  return new Vector3(this);
    	};

    	Vector3_1 = Vector3;
    	return Vector3_1;
    }

    /**
     * @fileOverview
     * @author David Gossow - dgossow@willowgarage.com
     */

    var Quaternion_1;
    var hasRequiredQuaternion;

    function requireQuaternion () {
    	if (hasRequiredQuaternion) return Quaternion_1;
    	hasRequiredQuaternion = 1;
    	/**
    	 * A Quaternion.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {number} [options.x=0] - The x value.
    	 * @param {number} [options.y=0] - The y value.
    	 * @param {number} [options.z=0] - The z value.
    	 * @param {number} [options.w=1] - The w value.
    	 */
    	function Quaternion(options) {
    	  options = options || {};
    	  this.x = options.x || 0;
    	  this.y = options.y || 0;
    	  this.z = options.z || 0;
    	  this.w = (typeof options.w === 'number') ? options.w : 1;
    	}

    	/**
    	 * Perform a conjugation on this quaternion.
    	 */
    	Quaternion.prototype.conjugate = function() {
    	  this.x *= -1;
    	  this.y *= -1;
    	  this.z *= -1;
    	};

    	/**
    	 * Return the norm of this quaternion.
    	 */
    	Quaternion.prototype.norm = function() {
    	  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    	};

    	/**
    	 * Perform a normalization on this quaternion.
    	 */
    	Quaternion.prototype.normalize = function() {
    	  var l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    	  if (l === 0) {
    	    this.x = 0;
    	    this.y = 0;
    	    this.z = 0;
    	    this.w = 1;
    	  } else {
    	    l = 1 / l;
    	    this.x = this.x * l;
    	    this.y = this.y * l;
    	    this.z = this.z * l;
    	    this.w = this.w * l;
    	  }
    	};

    	/**
    	 * Convert this quaternion into its inverse.
    	 */
    	Quaternion.prototype.invert = function() {
    	  this.conjugate();
    	  this.normalize();
    	};

    	/**
    	 * Set the values of this quaternion to the product of itself and the given quaternion.
    	 *
    	 * @param {Quaternion} q - The quaternion to multiply with.
    	 */
    	Quaternion.prototype.multiply = function(q) {
    	  var newX = this.x * q.w + this.y * q.z - this.z * q.y + this.w * q.x;
    	  var newY = -this.x * q.z + this.y * q.w + this.z * q.x + this.w * q.y;
    	  var newZ = this.x * q.y - this.y * q.x + this.z * q.w + this.w * q.z;
    	  var newW = -this.x * q.x - this.y * q.y - this.z * q.z + this.w * q.w;
    	  this.x = newX;
    	  this.y = newY;
    	  this.z = newZ;
    	  this.w = newW;
    	};

    	/**
    	 * Clone a copy of this quaternion.
    	 *
    	 * @returns {Quaternion} The cloned quaternion.
    	 */
    	Quaternion.prototype.clone = function() {
    	  return new Quaternion(this);
    	};

    	Quaternion_1 = Quaternion;
    	return Quaternion_1;
    }

    /**
     * @fileOverview
     * @author David Gossow - dgossow@willowgarage.com
     */

    var Pose_1;
    var hasRequiredPose;

    function requirePose () {
    	if (hasRequiredPose) return Pose_1;
    	hasRequiredPose = 1;
    	var Vector3 = requireVector3();
    	var Quaternion = requireQuaternion();

    	/**
    	 * A Pose in 3D space. Values are copied into this object.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Vector3} options.position - The ROSLIB.Vector3 describing the position.
    	 * @param {Quaternion} options.orientation - The ROSLIB.Quaternion describing the orientation.
    	 */
    	function Pose(options) {
    	  options = options || {};
    	  // copy the values into this object if they exist
    	  this.position = new Vector3(options.position);
    	  this.orientation = new Quaternion(options.orientation);
    	}

    	/**
    	 * Apply a transform against this pose.
    	 *
    	 * @param {Transform} tf - The transform to be applied.
    	 */
    	Pose.prototype.applyTransform = function(tf) {
    	  this.position.multiplyQuaternion(tf.rotation);
    	  this.position.add(tf.translation);
    	  var tmp = tf.rotation.clone();
    	  tmp.multiply(this.orientation);
    	  this.orientation = tmp;
    	};

    	/**
    	 * Clone a copy of this pose.
    	 *
    	 * @returns {Pose} The cloned pose.
    	 */
    	Pose.prototype.clone = function() {
    	  return new Pose(this);
    	};

    	/**
    	 * Multiply this pose with another pose without altering this pose.
    	 *
    	 * @returns {Pose} The result of the multiplication.
    	 */
    	Pose.prototype.multiply = function(pose) {
    	  var p = pose.clone();
    	  p.applyTransform({ rotation: this.orientation, translation: this.position });
    	  return p;
    	};

    	/**
    	 * Compute the inverse of this pose.
    	 *
    	 * @returns {Pose} The inverse of the pose.
    	 */
    	Pose.prototype.getInverse = function() {
    	  var inverse = this.clone();
    	  inverse.orientation.invert();
    	  inverse.position.multiplyQuaternion(inverse.orientation);
    	  inverse.position.x *= -1;
    	  inverse.position.y *= -1;
    	  inverse.position.z *= -1;
    	  return inverse;
    	};

    	Pose_1 = Pose;
    	return Pose_1;
    }

    /**
     * @fileOverview
     * @author David Gossow - dgossow@willowgarage.com
     */

    var Transform_1;
    var hasRequiredTransform;

    function requireTransform () {
    	if (hasRequiredTransform) return Transform_1;
    	hasRequiredTransform = 1;
    	var Vector3 = requireVector3();
    	var Quaternion = requireQuaternion();

    	/**
    	 * A Transform in 3-space. Values are copied into this object.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Vector3} options.translation - The ROSLIB.Vector3 describing the translation.
    	 * @param {Quaternion} options.rotation - The ROSLIB.Quaternion describing the rotation.
    	 */
    	function Transform(options) {
    	  options = options || {};
    	  // Copy the values into this object if they exist
    	  this.translation = new Vector3(options.translation);
    	  this.rotation = new Quaternion(options.rotation);
    	}

    	/**
    	 * Clone a copy of this transform.
    	 *
    	 * @returns {Transform} The cloned transform.
    	 */
    	Transform.prototype.clone = function() {
    	  return new Transform(this);
    	};

    	Transform_1 = Transform;
    	return Transform_1;
    }

    var math;
    var hasRequiredMath;

    function requireMath () {
    	if (hasRequiredMath) return math;
    	hasRequiredMath = 1;
    	math = {
    	    Pose: requirePose(),
    	    Quaternion: requireQuaternion(),
    	    Transform: requireTransform(),
    	    Vector3: requireVector3()
    	};
    	return math;
    }

    var tf = {exports: {}};

    /**
     * @fileOverview
     * @author David Gossow - dgossow@willowgarage.com
     */

    var TFClient_1;
    var hasRequiredTFClient;

    function requireTFClient () {
    	if (hasRequiredTFClient) return TFClient_1;
    	hasRequiredTFClient = 1;
    	var ActionClient = requireActionClient();
    	var Goal = requireGoal();

    	var Service = requireService();
    	var ServiceRequest = requireServiceRequest();
    	var Topic = requireTopic();

    	var Transform = requireTransform();

    	/**
    	 * A TF Client that listens to TFs from tf2_web_republisher.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Ros} options.ros - The ROSLIB.Ros connection handle.
    	 * @param {string} [options.fixedFrame=base_link] - The fixed frame.
    	 * @param {number} [options.angularThres=2.0] - The angular threshold for the TF republisher.
    	 * @param {number} [options.transThres=0.01] - The translation threshold for the TF republisher.
    	 * @param {number} [options.rate=10.0] - The rate for the TF republisher.
    	 * @param {number} [options.updateDelay=50] - The time (in ms) to wait after a new subscription
    	 *     to update the TF republisher's list of TFs.
    	 * @param {number} [options.topicTimeout=2.0] - The timeout parameter for the TF republisher.
    	 * @param {string} [options.serverName=/tf2_web_republisher] - The name of the tf2_web_republisher server.
    	 * @param {string} [options.repubServiceName=/republish_tfs] - The name of the republish_tfs service (non groovy compatibility mode only).
    	 */
    	function TFClient(options) {
    	  options = options || {};
    	  this.ros = options.ros;
    	  this.fixedFrame = options.fixedFrame || 'base_link';
    	  this.angularThres = options.angularThres || 2.0;
    	  this.transThres = options.transThres || 0.01;
    	  this.rate = options.rate || 10.0;
    	  this.updateDelay = options.updateDelay || 50;
    	  var seconds = options.topicTimeout || 2.0;
    	  var secs = Math.floor(seconds);
    	  var nsecs = Math.floor((seconds - secs) * 1000000000);
    	  this.topicTimeout = {
    	    secs: secs,
    	    nsecs: nsecs
    	  };
    	  this.serverName = options.serverName || '/tf2_web_republisher';
    	  this.repubServiceName = options.repubServiceName || '/republish_tfs';

    	  this.currentGoal = false;
    	  this.currentTopic = false;
    	  this.frameInfos = {};
    	  this.republisherUpdateRequested = false;
    	  this._subscribeCB = null;
    	  this._isDisposed = false;

    	  // Create an Action Client
    	  this.actionClient = new ActionClient({
    	    ros : options.ros,
    	    serverName : this.serverName,
    	    actionName : 'tf2_web_republisher/TFSubscriptionAction',
    	    omitStatus : true,
    	    omitResult : true
    	  });

    	  // Create a Service Client
    	  this.serviceClient = new Service({
    	    ros: options.ros,
    	    name: this.repubServiceName,
    	    serviceType: 'tf2_web_republisher/RepublishTFs'
    	  });
    	}

    	/**
    	 * Process the incoming TF message and send them out using the callback
    	 * functions.
    	 *
    	 * @param {Object} tf - The TF message from the server.
    	 */
    	TFClient.prototype.processTFArray = function(tf) {
    	  tf.transforms.forEach(function(transform) {
    	    var frameID = transform.child_frame_id;
    	    if (frameID[0] === '/')
    	    {
    	      frameID = frameID.substring(1);
    	    }
    	    var info = this.frameInfos[frameID];
    	    if (info) {
    	      info.transform = new Transform({
    	        translation : transform.transform.translation,
    	        rotation : transform.transform.rotation
    	      });
    	      info.cbs.forEach(function(cb) {
    	        cb(info.transform);
    	      });
    	    }
    	  }, this);
    	};

    	/**
    	 * Create and send a new goal (or service request) to the tf2_web_republisher
    	 * based on the current list of TFs.
    	 */
    	TFClient.prototype.updateGoal = function() {
    	  var goalMessage = {
    	    source_frames : Object.keys(this.frameInfos),
    	    target_frame : this.fixedFrame,
    	    angular_thres : this.angularThres,
    	    trans_thres : this.transThres,
    	    rate : this.rate
    	  };

    	  // if we're running in groovy compatibility mode (the default)
    	  // then use the action interface to tf2_web_republisher
    	  if(this.ros.groovyCompatibility) {
    	    if (this.currentGoal) {
    	      this.currentGoal.cancel();
    	    }
    	    this.currentGoal = new Goal({
    	      actionClient : this.actionClient,
    	      goalMessage : goalMessage
    	    });

    	    this.currentGoal.on('feedback', this.processTFArray.bind(this));
    	    this.currentGoal.send();
    	  }
    	  else {
    	    // otherwise, use the service interface
    	    // The service interface has the same parameters as the action,
    	    // plus the timeout
    	    goalMessage.timeout = this.topicTimeout;
    	    var request = new ServiceRequest(goalMessage);

    	    this.serviceClient.callService(request, this.processResponse.bind(this));
    	  }

    	  this.republisherUpdateRequested = false;
    	};

    	/**
    	 * Process the service response and subscribe to the tf republisher
    	 * topic.
    	 *
    	 * @param {Object} response - The service response containing the topic name.
    	 */
    	TFClient.prototype.processResponse = function(response) {
    	  // Do not setup a topic subscription if already disposed. Prevents a race condition where
    	  // The dispose() function is called before the service call receives a response.
    	  if (this._isDisposed) {
    	    return;
    	  }

    	  // if we subscribed to a topic before, unsubscribe so
    	  // the republisher stops publishing it
    	  if (this.currentTopic) {
    	    this.currentTopic.unsubscribe(this._subscribeCB);
    	  }

    	  this.currentTopic = new Topic({
    	    ros: this.ros,
    	    name: response.topic_name,
    	    messageType: 'tf2_web_republisher/TFArray'
    	  });
    	  this._subscribeCB = this.processTFArray.bind(this);
    	  this.currentTopic.subscribe(this._subscribeCB);
    	};

    	/**
    	 * Subscribe to the given TF frame.
    	 *
    	 * @param {string} frameID - The TF frame to subscribe to.
    	 * @param {function} callback - Function with the following params:
    	 * @param {Transform} callback.transform - The transform data.
    	 */
    	TFClient.prototype.subscribe = function(frameID, callback) {
    	  // remove leading slash, if it's there
    	  if (frameID[0] === '/')
    	  {
    	    frameID = frameID.substring(1);
    	  }
    	  // if there is no callback registered for the given frame, create empty callback list
    	  if (!this.frameInfos[frameID]) {
    	    this.frameInfos[frameID] = {
    	      cbs: []
    	    };
    	    if (!this.republisherUpdateRequested) {
    	      setTimeout(this.updateGoal.bind(this), this.updateDelay);
    	      this.republisherUpdateRequested = true;
    	    }
    	  }
    	  // if we already have a transform, callback immediately
    	  else if (this.frameInfos[frameID].transform) {
    	    callback(this.frameInfos[frameID].transform);
    	  }
    	  this.frameInfos[frameID].cbs.push(callback);
    	};

    	/**
    	 * Unsubscribe from the given TF frame.
    	 *
    	 * @param {string} frameID - The TF frame to unsubscribe from.
    	 * @param {function} callback - The callback function to remove.
    	 */
    	TFClient.prototype.unsubscribe = function(frameID, callback) {
    	  // remove leading slash, if it's there
    	  if (frameID[0] === '/')
    	  {
    	    frameID = frameID.substring(1);
    	  }
    	  var info = this.frameInfos[frameID];
    	  for (var cbs = info && info.cbs || [], idx = cbs.length; idx--;) {
    	    if (cbs[idx] === callback) {
    	      cbs.splice(idx, 1);
    	    }
    	  }
    	  if (!callback || cbs.length === 0) {
    	    delete this.frameInfos[frameID];
    	  }
    	};

    	/**
    	 * Unsubscribe and unadvertise all topics associated with this TFClient.
    	 */
    	TFClient.prototype.dispose = function() {
    	  this._isDisposed = true;
    	  this.actionClient.dispose();
    	  if (this.currentTopic) {
    	    this.currentTopic.unsubscribe(this._subscribeCB);
    	  }
    	};

    	TFClient_1 = TFClient;
    	return TFClient_1;
    }

    var hasRequiredTf;

    function requireTf () {
    	if (hasRequiredTf) return tf.exports;
    	hasRequiredTf = 1;
    	var Ros = requireRos();
    	var mixin = requireMixin();

    	var tf$1 = tf.exports = {
    	    TFClient: requireTFClient()
    	};

    	mixin(Ros, ['TFClient'], tf$1);
    	return tf.exports;
    }

    var UrdfTypes;
    var hasRequiredUrdfTypes;

    function requireUrdfTypes () {
    	if (hasRequiredUrdfTypes) return UrdfTypes;
    	hasRequiredUrdfTypes = 1;
    	UrdfTypes = {
    		URDF_SPHERE : 0,
    		URDF_BOX : 1,
    		URDF_CYLINDER : 2,
    		URDF_MESH : 3
    	};
    	return UrdfTypes;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfBox_1;
    var hasRequiredUrdfBox;

    function requireUrdfBox () {
    	if (hasRequiredUrdfBox) return UrdfBox_1;
    	hasRequiredUrdfBox = 1;
    	var Vector3 = requireVector3();
    	var UrdfTypes = requireUrdfTypes();

    	/**
    	 * A Box element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfBox(options) {
    	  this.dimension = null;
    	  this.type = UrdfTypes.URDF_BOX;

    	  // Parse the xml string
    	  var xyz = options.xml.getAttribute('size').split(' ');
    	  this.dimension = new Vector3({
    	    x : parseFloat(xyz[0]),
    	    y : parseFloat(xyz[1]),
    	    z : parseFloat(xyz[2])
    	  });
    	}

    	UrdfBox_1 = UrdfBox;
    	return UrdfBox_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfColor_1;
    var hasRequiredUrdfColor;

    function requireUrdfColor () {
    	if (hasRequiredUrdfColor) return UrdfColor_1;
    	hasRequiredUrdfColor = 1;
    	/**
    	 * A Color element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfColor(options) {
    	  // Parse the xml string
    	  var rgba = options.xml.getAttribute('rgba').split(' ');
    	  this.r = parseFloat(rgba[0]);
    	  this.g = parseFloat(rgba[1]);
    	  this.b = parseFloat(rgba[2]);
    	  this.a = parseFloat(rgba[3]);
    	}

    	UrdfColor_1 = UrdfColor;
    	return UrdfColor_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfCylinder_1;
    var hasRequiredUrdfCylinder;

    function requireUrdfCylinder () {
    	if (hasRequiredUrdfCylinder) return UrdfCylinder_1;
    	hasRequiredUrdfCylinder = 1;
    	var UrdfTypes = requireUrdfTypes();

    	/**
    	 * A Cylinder element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfCylinder(options) {
    	  this.type = UrdfTypes.URDF_CYLINDER;
    	  this.length = parseFloat(options.xml.getAttribute('length'));
    	  this.radius = parseFloat(options.xml.getAttribute('radius'));
    	}

    	UrdfCylinder_1 = UrdfCylinder;
    	return UrdfCylinder_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfMaterial_1;
    var hasRequiredUrdfMaterial;

    function requireUrdfMaterial () {
    	if (hasRequiredUrdfMaterial) return UrdfMaterial_1;
    	hasRequiredUrdfMaterial = 1;
    	var UrdfColor = requireUrdfColor();

    	/**
    	 * A Material element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfMaterial(options) {
    	  this.textureFilename = null;
    	  this.color = null;

    	  this.name = options.xml.getAttribute('name');

    	  // Texture
    	  var textures = options.xml.getElementsByTagName('texture');
    	  if (textures.length > 0) {
    	    this.textureFilename = textures[0].getAttribute('filename');
    	  }

    	  // Color
    	  var colors = options.xml.getElementsByTagName('color');
    	  if (colors.length > 0) {
    	    // Parse the RBGA string
    	    this.color = new UrdfColor({
    	      xml : colors[0]
    	    });
    	  }
    	}

    	UrdfMaterial.prototype.isLink = function() {
    	  return this.color === null && this.textureFilename === null;
    	};

    	var assign = objectAssign;

    	UrdfMaterial.prototype.assign = function(obj) {
    	    return assign(this, obj);
    	};

    	UrdfMaterial_1 = UrdfMaterial;
    	return UrdfMaterial_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfMesh_1;
    var hasRequiredUrdfMesh;

    function requireUrdfMesh () {
    	if (hasRequiredUrdfMesh) return UrdfMesh_1;
    	hasRequiredUrdfMesh = 1;
    	var Vector3 = requireVector3();
    	var UrdfTypes = requireUrdfTypes();

    	/**
    	 * A Mesh element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfMesh(options) {
    	  this.scale = null;

    	  this.type = UrdfTypes.URDF_MESH;
    	  this.filename = options.xml.getAttribute('filename');

    	  // Check for a scale
    	  var scale = options.xml.getAttribute('scale');
    	  if (scale) {
    	    // Get the XYZ
    	    var xyz = scale.split(' ');
    	    this.scale = new Vector3({
    	      x : parseFloat(xyz[0]),
    	      y : parseFloat(xyz[1]),
    	      z : parseFloat(xyz[2])
    	    });
    	  }
    	}

    	UrdfMesh_1 = UrdfMesh;
    	return UrdfMesh_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfSphere_1;
    var hasRequiredUrdfSphere;

    function requireUrdfSphere () {
    	if (hasRequiredUrdfSphere) return UrdfSphere_1;
    	hasRequiredUrdfSphere = 1;
    	var UrdfTypes = requireUrdfTypes();

    	/**
    	 * A Sphere element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfSphere(options) {
    	  this.type = UrdfTypes.URDF_SPHERE;
    	  this.radius = parseFloat(options.xml.getAttribute('radius'));
    	}

    	UrdfSphere_1 = UrdfSphere;
    	return UrdfSphere_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfVisual_1;
    var hasRequiredUrdfVisual;

    function requireUrdfVisual () {
    	if (hasRequiredUrdfVisual) return UrdfVisual_1;
    	hasRequiredUrdfVisual = 1;
    	var Pose = requirePose();
    	var Vector3 = requireVector3();
    	var Quaternion = requireQuaternion();

    	var UrdfCylinder = requireUrdfCylinder();
    	var UrdfBox = requireUrdfBox();
    	var UrdfMaterial = requireUrdfMaterial();
    	var UrdfMesh = requireUrdfMesh();
    	var UrdfSphere = requireUrdfSphere();

    	/**
    	 * A Visual element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfVisual(options) {
    	  var xml = options.xml;
    	  this.origin = null;
    	  this.geometry = null;
    	  this.material = null;

    	  this.name = options.xml.getAttribute('name');

    	  // Origin
    	  var origins = xml.getElementsByTagName('origin');
    	  if (origins.length === 0) {
    	    // use the identity as the default
    	    this.origin = new Pose();
    	  } else {
    	    // Check the XYZ
    	    var xyz = origins[0].getAttribute('xyz');
    	    var position = new Vector3();
    	    if (xyz) {
    	      xyz = xyz.split(' ');
    	      position = new Vector3({
    	        x : parseFloat(xyz[0]),
    	        y : parseFloat(xyz[1]),
    	        z : parseFloat(xyz[2])
    	      });
    	    }

    	    // Check the RPY
    	    var rpy = origins[0].getAttribute('rpy');
    	    var orientation = new Quaternion();
    	    if (rpy) {
    	      rpy = rpy.split(' ');
    	      // Convert from RPY
    	      var roll = parseFloat(rpy[0]);
    	      var pitch = parseFloat(rpy[1]);
    	      var yaw = parseFloat(rpy[2]);
    	      var phi = roll / 2.0;
    	      var the = pitch / 2.0;
    	      var psi = yaw / 2.0;
    	      var x = Math.sin(phi) * Math.cos(the) * Math.cos(psi) - Math.cos(phi) * Math.sin(the)
    	          * Math.sin(psi);
    	      var y = Math.cos(phi) * Math.sin(the) * Math.cos(psi) + Math.sin(phi) * Math.cos(the)
    	          * Math.sin(psi);
    	      var z = Math.cos(phi) * Math.cos(the) * Math.sin(psi) - Math.sin(phi) * Math.sin(the)
    	          * Math.cos(psi);
    	      var w = Math.cos(phi) * Math.cos(the) * Math.cos(psi) + Math.sin(phi) * Math.sin(the)
    	          * Math.sin(psi);

    	      orientation = new Quaternion({
    	        x : x,
    	        y : y,
    	        z : z,
    	        w : w
    	      });
    	      orientation.normalize();
    	    }
    	    this.origin = new Pose({
    	      position : position,
    	      orientation : orientation
    	    });
    	  }

    	  // Geometry
    	  var geoms = xml.getElementsByTagName('geometry');
    	  if (geoms.length > 0) {
    	    var geom = geoms[0];
    	    var shape = null;
    	    // Check for the shape
    	    for (var i = 0; i < geom.childNodes.length; i++) {
    	      var node = geom.childNodes[i];
    	      if (node.nodeType === 1) {
    	        shape = node;
    	        break;
    	      }
    	    }
    	    // Check the type
    	    var type = shape.nodeName;
    	    if (type === 'sphere') {
    	      this.geometry = new UrdfSphere({
    	        xml : shape
    	      });
    	    } else if (type === 'box') {
    	      this.geometry = new UrdfBox({
    	        xml : shape
    	      });
    	    } else if (type === 'cylinder') {
    	      this.geometry = new UrdfCylinder({
    	        xml : shape
    	      });
    	    } else if (type === 'mesh') {
    	      this.geometry = new UrdfMesh({
    	        xml : shape
    	      });
    	    } else {
    	      console.warn('Unknown geometry type ' + type);
    	    }
    	  }

    	  // Material
    	  var materials = xml.getElementsByTagName('material');
    	  if (materials.length > 0) {
    	    this.material = new UrdfMaterial({
    	      xml : materials[0]
    	    });
    	  }
    	}

    	UrdfVisual_1 = UrdfVisual;
    	return UrdfVisual_1;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfLink_1;
    var hasRequiredUrdfLink;

    function requireUrdfLink () {
    	if (hasRequiredUrdfLink) return UrdfLink_1;
    	hasRequiredUrdfLink = 1;
    	var UrdfVisual = requireUrdfVisual();

    	/**
    	 * A Link element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfLink(options) {
    	  this.name = options.xml.getAttribute('name');
    	  this.visuals = [];
    	  var visuals = options.xml.getElementsByTagName('visual');

    	  for( var i=0; i<visuals.length; i++ ) {
    	    this.visuals.push( new UrdfVisual({
    	      xml : visuals[i]
    	    }) );
    	  }
    	}

    	UrdfLink_1 = UrdfLink;
    	return UrdfLink_1;
    }

    /**
     * @fileOverview
     * @author David V. Lu!! - davidvlu@gmail.com
     */

    var UrdfJoint_1;
    var hasRequiredUrdfJoint;

    function requireUrdfJoint () {
    	if (hasRequiredUrdfJoint) return UrdfJoint_1;
    	hasRequiredUrdfJoint = 1;
    	var Pose = requirePose();
    	var Vector3 = requireVector3();
    	var Quaternion = requireQuaternion();

    	/**
    	 * A Joint element in a URDF.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 */
    	function UrdfJoint(options) {
    	  this.name = options.xml.getAttribute('name');
    	  this.type = options.xml.getAttribute('type');

    	  var parents = options.xml.getElementsByTagName('parent');
    	  if(parents.length > 0) {
    	    this.parent = parents[0].getAttribute('link');
    	  }

    	  var children = options.xml.getElementsByTagName('child');
    	  if(children.length > 0) {
    	    this.child = children[0].getAttribute('link');
    	  }

    	  var limits = options.xml.getElementsByTagName('limit');
    	  if (limits.length > 0) {
    	    this.minval = parseFloat( limits[0].getAttribute('lower') );
    	    this.maxval = parseFloat( limits[0].getAttribute('upper') );
    	  }

    	  // Origin
    	  var origins = options.xml.getElementsByTagName('origin');
    	  if (origins.length === 0) {
    	    // use the identity as the default
    	    this.origin = new Pose();
    	  } else {
    	    // Check the XYZ
    	    var xyz = origins[0].getAttribute('xyz');
    	    var position = new Vector3();
    	    if (xyz) {
    	      xyz = xyz.split(' ');
    	      position = new Vector3({
    	        x : parseFloat(xyz[0]),
    	        y : parseFloat(xyz[1]),
    	        z : parseFloat(xyz[2])
    	      });
    	    }

    	    // Check the RPY
    	    var rpy = origins[0].getAttribute('rpy');
    	    var orientation = new Quaternion();
    	    if (rpy) {
    	      rpy = rpy.split(' ');
    	      // Convert from RPY
    	      var roll = parseFloat(rpy[0]);
    	      var pitch = parseFloat(rpy[1]);
    	      var yaw = parseFloat(rpy[2]);
    	      var phi = roll / 2.0;
    	      var the = pitch / 2.0;
    	      var psi = yaw / 2.0;
    	      var x = Math.sin(phi) * Math.cos(the) * Math.cos(psi) - Math.cos(phi) * Math.sin(the)
    	          * Math.sin(psi);
    	      var y = Math.cos(phi) * Math.sin(the) * Math.cos(psi) + Math.sin(phi) * Math.cos(the)
    	          * Math.sin(psi);
    	      var z = Math.cos(phi) * Math.cos(the) * Math.sin(psi) - Math.sin(phi) * Math.sin(the)
    	          * Math.cos(psi);
    	      var w = Math.cos(phi) * Math.cos(the) * Math.cos(psi) + Math.sin(phi) * Math.sin(the)
    	          * Math.sin(psi);

    	      orientation = new Quaternion({
    	        x : x,
    	        y : y,
    	        z : z,
    	        w : w
    	      });
    	      orientation.normalize();
    	    }
    	    this.origin = new Pose({
    	      position : position,
    	      orientation : orientation
    	    });
    	  }
    	}

    	UrdfJoint_1 = UrdfJoint;
    	return UrdfJoint_1;
    }

    var xmldom = {};

    var hasRequiredXmldom;

    function requireXmldom () {
    	if (hasRequiredXmldom) return xmldom;
    	hasRequiredXmldom = 1;
    	xmldom.DOMImplementation = window.DOMImplementation;
    	xmldom.XMLSerializer = window.XMLSerializer;
    	xmldom.DOMParser = window.DOMParser;
    	return xmldom;
    }

    /**
     * @fileOverview
     * @author Benjamin Pitzer - ben.pitzer@gmail.com
     * @author Russell Toris - rctoris@wpi.edu
     */

    var UrdfModel_1;
    var hasRequiredUrdfModel;

    function requireUrdfModel () {
    	if (hasRequiredUrdfModel) return UrdfModel_1;
    	hasRequiredUrdfModel = 1;
    	var UrdfMaterial = requireUrdfMaterial();
    	var UrdfLink = requireUrdfLink();
    	var UrdfJoint = requireUrdfJoint();
    	var DOMParser = requireXmldom().DOMParser;

    	/**
    	 * A URDF Model can be used to parse a given URDF into the appropriate elements.
    	 *
    	 * @constructor
    	 * @param {Object} options
    	 * @param {Element} options.xml - The XML element to parse.
    	 * @param {string} options.string - The XML element to parse as a string.
    	 */
    	function UrdfModel(options) {
    	  options = options || {};
    	  var xmlDoc = options.xml;
    	  var string = options.string;
    	  this.materials = {};
    	  this.links = {};
    	  this.joints = {};

    	  // Check if we are using a string or an XML element
    	  if (string) {
    	    // Parse the string
    	    var parser = new DOMParser();
    	    xmlDoc = parser.parseFromString(string, 'text/xml');
    	  }

    	  // Initialize the model with the given XML node.
    	  // Get the robot tag
    	  var robotXml = xmlDoc.documentElement;

    	  // Get the robot name
    	  this.name = robotXml.getAttribute('name');

    	  // Parse all the visual elements we need
    	  for (var nodes = robotXml.childNodes, i = 0; i < nodes.length; i++) {
    	    var node = nodes[i];
    	    if (node.tagName === 'material') {
    	      var material = new UrdfMaterial({
    	        xml : node
    	      });
    	      // Make sure this is unique
    	      if (this.materials[material.name] !== void 0) {
    	        if( this.materials[material.name].isLink() ) {
    	          this.materials[material.name].assign( material );
    	        } else {
    	          console.warn('Material ' + material.name + 'is not unique.');
    	        }
    	      } else {
    	        this.materials[material.name] = material;
    	      }
    	    } else if (node.tagName === 'link') {
    	      var link = new UrdfLink({
    	        xml : node
    	      });
    	      // Make sure this is unique
    	      if (this.links[link.name] !== void 0) {
    	        console.warn('Link ' + link.name + ' is not unique.');
    	      } else {
    	        // Check for a material
    	        for( var j=0; j<link.visuals.length; j++ )
    	        {
    	          var mat = link.visuals[j].material;
    	          if ( mat !== null && mat.name ) {
    	            if (this.materials[mat.name] !== void 0) {
    	              link.visuals[j].material = this.materials[mat.name];
    	            } else {
    	              this.materials[mat.name] = mat;
    	            }
    	          }
    	        }

    	        // Add the link
    	        this.links[link.name] = link;
    	      }
    	    } else if (node.tagName === 'joint') {
    	      var joint = new UrdfJoint({
    	        xml : node
    	      });
    	      this.joints[joint.name] = joint;
    	    }
    	  }
    	}

    	UrdfModel_1 = UrdfModel;
    	return UrdfModel_1;
    }

    var urdf;
    var hasRequiredUrdf;

    function requireUrdf () {
    	if (hasRequiredUrdf) return urdf;
    	hasRequiredUrdf = 1;
    	urdf = objectAssign({
    	    UrdfBox: requireUrdfBox(),
    	    UrdfColor: requireUrdfColor(),
    	    UrdfCylinder: requireUrdfCylinder(),
    	    UrdfLink: requireUrdfLink(),
    	    UrdfMaterial: requireUrdfMaterial(),
    	    UrdfMesh: requireUrdfMesh(),
    	    UrdfModel: requireUrdfModel(),
    	    UrdfSphere: requireUrdfSphere(),
    	    UrdfVisual: requireUrdfVisual()
    	}, requireUrdfTypes());
    	return urdf;
    }

    /**
     * @fileOverview
     * @author Russell Toris - rctoris@wpi.edu
     */

    /**
     * If you use roslib in a browser, all the classes will be exported to a global variable called ROSLIB.
     *
     * If you use nodejs, this is the variable you get when you require('roslib').
     */
    var ROSLIB = commonjsGlobal.ROSLIB || {
      /**
       * @default
       * @description Library version
       */
      REVISION : '1.4.1'
    };

    var assign = objectAssign;

    // Add core components
    assign(ROSLIB, requireCore());

    assign(ROSLIB, requireActionlib());

    assign(ROSLIB, requireMath());

    assign(ROSLIB, requireTf());

    assign(ROSLIB, requireUrdf());

    var RosLib = ROSLIB;

    var ROSLIB$1 = /*@__PURE__*/getDefaultExportFromCjs(RosLib);

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let h2;
    	let t3;
    	let p0;
    	let t4;
    	let t5;
    	let t6;
    	let p1;
    	let t7;
    	let t8;
    	let t9;
    	let p2;
    	let t10;
    	let t11;
    	let t12;
    	let p3;
    	let t13;
    	let t14;
    	let t15;
    	let p4;
    	let t16;
    	let t17;
    	let t18;
    	let button0;
    	let t20;
    	let button1;
    	let t22;
    	let button2;
    	let t24;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "ROS GUI!";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Under Construction.";
    			t3 = space();
    			p0 = element("p");
    			t4 = text("Turtle Sim x: ");
    			t5 = text(/*x*/ ctx[0]);
    			t6 = space();
    			p1 = element("p");
    			t7 = text("Turtle Sim y: ");
    			t8 = text(/*y*/ ctx[1]);
    			t9 = space();
    			p2 = element("p");
    			t10 = text("Turtle Sim theta: ");
    			t11 = text(/*theta*/ ctx[2]);
    			t12 = space();
    			p3 = element("p");
    			t13 = text("Turtle Sim linear velcoity: ");
    			t14 = text(/*linear_v*/ ctx[3]);
    			t15 = space();
    			p4 = element("p");
    			t16 = text("Turtle Sim angular velocity: ");
    			t17 = text(/*angular_v*/ ctx[4]);
    			t18 = space();
    			button0 = element("button");
    			button0.textContent = "Forward";
    			t20 = space();
    			button1 = element("button");
    			button1.textContent = "Back";
    			t22 = space();
    			button2 = element("button");
    			button2.textContent = "Right";
    			t24 = space();
    			button3 = element("button");
    			button3.textContent = "Left";
    			attr_dev(h1, "class", "svelte-1vq0rbn");
    			add_location(h1, file, 121, 1, 2503);
    			attr_dev(h2, "class", "svelte-1vq0rbn");
    			add_location(h2, file, 122, 1, 2522);
    			attr_dev(p0, "class", "svelte-1vq0rbn");
    			add_location(p0, file, 123, 1, 2552);
    			attr_dev(p1, "class", "svelte-1vq0rbn");
    			add_location(p1, file, 124, 1, 2578);
    			attr_dev(p2, "class", "svelte-1vq0rbn");
    			add_location(p2, file, 125, 1, 2604);
    			attr_dev(p3, "class", "svelte-1vq0rbn");
    			add_location(p3, file, 126, 1, 2638);
    			attr_dev(p4, "class", "svelte-1vq0rbn");
    			add_location(p4, file, 127, 1, 2685);
    			add_location(button0, file, 128, 1, 2734);
    			add_location(button1, file, 129, 1, 2784);
    			add_location(button2, file, 130, 1, 2828);
    			add_location(button3, file, 131, 1, 2874);
    			attr_dev(main, "class", "svelte-1vq0rbn");
    			add_location(main, file, 120, 0, 2495);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h2);
    			append_dev(main, t3);
    			append_dev(main, p0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(main, t6);
    			append_dev(main, p1);
    			append_dev(p1, t7);
    			append_dev(p1, t8);
    			append_dev(main, t9);
    			append_dev(main, p2);
    			append_dev(p2, t10);
    			append_dev(p2, t11);
    			append_dev(main, t12);
    			append_dev(main, p3);
    			append_dev(p3, t13);
    			append_dev(p3, t14);
    			append_dev(main, t15);
    			append_dev(main, p4);
    			append_dev(p4, t16);
    			append_dev(p4, t17);
    			append_dev(main, t18);
    			append_dev(main, button0);
    			append_dev(main, t20);
    			append_dev(main, button1);
    			append_dev(main, t22);
    			append_dev(main, button2);
    			append_dev(main, t24);
    			append_dev(main, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*move_forward*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*move_back*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*move_right*/ ctx[7], false, false, false, false),
    					listen_dev(button3, "click", /*move_left*/ ctx[8], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*x*/ 1) set_data_dev(t5, /*x*/ ctx[0]);
    			if (dirty & /*y*/ 2) set_data_dev(t8, /*y*/ ctx[1]);
    			if (dirty & /*theta*/ 4) set_data_dev(t11, /*theta*/ ctx[2]);
    			if (dirty & /*linear_v*/ 8) set_data_dev(t14, /*linear_v*/ ctx[3]);
    			if (dirty & /*angular_v*/ 16) set_data_dev(t17, /*angular_v*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	var ros = new ROSLIB$1.Ros({ url: 'ws://192.168.1.105:9090' });

    	ros.on('connection', function () {
    		console.log('Connected to websocket server.');
    	});

    	ros.on('error', function (error) {
    		console.log('Error connecting to websocket server: ', error);
    	});

    	ros.on('close', function () {
    		console.log('Connection to websocket server closed.');
    	});

    	// Publishing a Topic
    	// ------------------
    	var cmdVel = new ROSLIB$1.Topic({
    			ros,
    			name: '/turtle1/cmd_vel',
    			messageType: 'geometry_msgs/msg/Twist'
    		});

    	var twist = new ROSLIB$1.Message({ linear: { x: 0.1 }, angular: { z: -0.3 } });
    	cmdVel.publish(twist);

    	// Subscribing to a Topic
    	// ----------------------
    	let x = 0;

    	let y = 0;
    	let theta = 0;
    	let linear_v = 0;
    	let angular_v = 0;

    	var listener = new ROSLIB$1.Topic({
    			ros,
    			name: '/turtle1/pose',
    			messageType: 'turtlesim/msg/Pose'
    		});

    	listener.subscribe(function (message) {
    		$$invalidate(0, x = message.x);
    		$$invalidate(1, y = message.y);
    		$$invalidate(2, theta = message.theta);
    		$$invalidate(3, linear_v = message.linear_velocity);
    		$$invalidate(4, angular_v = message.angular_velocity);
    		console.log('Received message on ' + listener.name + ': ' + message.data);
    	}); // listener.unsubscribe();

    	// Calling a service
    	// -----------------
    	//   var addTwoIntsClient = new ROSLIB.Service({
    	//     ros : ros,
    	//     name : '/add_two_ints',
    	//     serviceType : 'rospy_tutorials/AddTwoInts'
    	//   });
    	//   var request = new ROSLIB.ServiceRequest({
    	//     a : 1,
    	//     b : 2
    	//   });
    	//   addTwoIntsClient.callService(request, function(result) {
    	//     console.log('Result for service call on '
    	//       + addTwoIntsClient.name
    	//       + ': '
    	//       + result.sum);
    	//   });
    	// Getting and setting a param value
    	// ---------------------------------
    	//   ros.getParams(function(params) {
    	//     console.log(params);
    	//   });
    	//   var maxVelX = new ROSLIB.Param({
    	//     ros : ros,
    	//     name : 'max_vel_y'
    	//   });
    	//   maxVelX.set(0.8);
    	//   maxVelX.get(function(value) {
    	//     console.log('MAX VAL: ' + value);
    	//   });
    	const move_forward = () => {
    		// function
    		console.log("Moving forward...");
    	};

    	const move_back = () => {
    		// function
    		console.log("Moving back...");
    	};

    	const move_right = () => {
    		// function
    		console.log("Moving right...");
    	};

    	const move_left = () => {
    		// function
    		console.log("Moving left...");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ROSLIB: ROSLIB$1,
    		ros,
    		cmdVel,
    		twist,
    		x,
    		y,
    		theta,
    		linear_v,
    		angular_v,
    		listener,
    		move_forward,
    		move_back,
    		move_right,
    		move_left
    	});

    	$$self.$inject_state = $$props => {
    		if ('ros' in $$props) ros = $$props.ros;
    		if ('cmdVel' in $$props) cmdVel = $$props.cmdVel;
    		if ('twist' in $$props) twist = $$props.twist;
    		if ('x' in $$props) $$invalidate(0, x = $$props.x);
    		if ('y' in $$props) $$invalidate(1, y = $$props.y);
    		if ('theta' in $$props) $$invalidate(2, theta = $$props.theta);
    		if ('linear_v' in $$props) $$invalidate(3, linear_v = $$props.linear_v);
    		if ('angular_v' in $$props) $$invalidate(4, angular_v = $$props.angular_v);
    		if ('listener' in $$props) listener = $$props.listener;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		x,
    		y,
    		theta,
    		linear_v,
    		angular_v,
    		move_forward,
    		move_back,
    		move_right,
    		move_left
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
