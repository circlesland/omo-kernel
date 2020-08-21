
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
this['omo-hello'] = this['omo-hello'] || {};
this['omo-hello'].svelte = (function () {
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
    function not_equal(a, b) {
        return a != a ? b == b : a !== b;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
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
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /* src/quanta/omo-hello.svelte generated by Svelte v3.24.1 */

    const file = "src/quanta/omo-hello.svelte";

    function create_fragment(ctx) {
    	let div6;
    	let div5;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div4;
    	let h20;
    	let t2;
    	let p;
    	let t4;
    	let div1;
    	let a0;
    	let t6;
    	let a1;
    	let svg;
    	let path;
    	let t7;
    	let t8;
    	let div3;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let h21;
    	let a2;
    	let t11;
    	let span;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div4 = element("div");
    			h20 = element("h2");
    			h20.textContent = "My Amazing Journey to the Mountains.";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora\n        reiciendis ad architecto at aut placeat quia, minus dolor praesentium\n        officia maxime deserunt porro amet ab debitis deleniti modi soluta\n        similique...";
    			t4 = space();
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "Show More";
    			t6 = space();
    			a1 = element("a");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t7 = text("\n          5");
    			t8 = space();
    			div3 = element("div");
    			div2 = element("div");
    			img1 = element("img");
    			t9 = space();
    			h21 = element("h2");
    			a2 = element("a");
    			a2.textContent = "By Mohammed Ibrahim";
    			t11 = space();
    			span = element("span");
    			span.textContent = "21 SEP 2015.";
    			this.c = noop;
    			if (img0.src !== (img0_src_value = "https://ik.imagekit.io/q5edmtudmz/post1_fOFO9VDzENE.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "mountains");
    			attr_dev(img0, "class", "w-full h-64 rounded-lg rounded-b-none");
    			add_location(img0, file, 72070, 6, 1427816);
    			attr_dev(div0, "class", "md:flex-shrink-0");
    			add_location(div0, file, 72069, 4, 1427779);
    			attr_dev(h20, "class", "font-bold text-2xl text-gray-800 tracking-normal");
    			add_location(h20, file, 72076, 6, 1428022);
    			attr_dev(p, "class", "text-sm text-gray-700 px-2 mr-1");
    			add_location(p, file, 72079, 6, 1428147);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "text-blue-500 text-xs -ml-3 ");
    			add_location(a0, file, 72086, 8, 1428521);
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "d", "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0\n              012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z");
    			add_location(path, file, 72093, 12, 1428792);
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "class", "w-6 h-6 text-blue-500");
    			attr_dev(svg, "stroke", "currentColor");
    			add_location(svg, file, 72088, 10, 1428642);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "flex text-gray-700");
    			add_location(a1, file, 72087, 8, 1428592);
    			attr_dev(div1, "class", "flex items-center justify-between mt-2 mx-6");
    			add_location(div1, file, 72085, 6, 1428455);
    			attr_dev(img1, "class", "w-12 h-12 object-cover rounded-full mx-4 shadow");
    			if (img1.src !== (img1_src_value = "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=731&q=80")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "avatar");
    			add_location(img1, file, 72105, 10, 1429198);
    			attr_dev(div2, "class", "user-logo");
    			add_location(div2, file, 72104, 8, 1429164);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file, 72111, 10, 1429536);
    			attr_dev(span, "class", "text-gray-600");
    			add_location(span, file, 72112, 10, 1429582);
    			attr_dev(h21, "class", "text-sm tracking-tighter text-gray-900");
    			add_location(h21, file, 72110, 8, 1429474);
    			attr_dev(div3, "class", "author flex items-center -ml-3 my-3");
    			add_location(div3, file, 72103, 6, 1429106);
    			attr_dev(div4, "class", "px-4 py-2 mt-2");
    			add_location(div4, file, 72075, 4, 1427987);
    			attr_dev(div5, "class", "bg-white shadow-2xl rounded-lg mb-6 tracking-wide");
    			add_location(div5, file, 72068, 2, 1427711);
    			attr_dev(div6, "class", "mx-auto px-4 py-8 max-w-xl my-20");
    			add_location(div6, file, 72067, 0, 1427662);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, img0);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, h20);
    			append_dev(div4, t2);
    			append_dev(div4, p);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t6);
    			append_dev(div1, a1);
    			append_dev(a1, svg);
    			append_dev(svg, path);
    			append_dev(a1, t7);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, img1);
    			append_dev(div3, t9);
    			append_dev(div3, h21);
    			append_dev(h21, a2);
    			append_dev(h21, t11);
    			append_dev(h21, span);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
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

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<omo-hello> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("omo-hello", $$slots, []);
    	return [];
    }

    class Omo_hello extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.space-y-0>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0px * var(--space-y-reverse))
}.space-x-0>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0px * var(--space-x-reverse));margin-left:calc(0px * calc(1 - var(--space-x-reverse)))
}.space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.25rem * var(--space-y-reverse))
}.space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.25rem * var(--space-x-reverse));margin-left:calc(0.25rem * calc(1 - var(--space-x-reverse)))
}.space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.5rem * var(--space-y-reverse))
}.space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.5rem * var(--space-x-reverse));margin-left:calc(0.5rem * calc(1 - var(--space-x-reverse)))
}.space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.75rem * var(--space-y-reverse))
}.space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.75rem * var(--space-x-reverse));margin-left:calc(0.75rem * calc(1 - var(--space-x-reverse)))
}.space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem * var(--space-y-reverse))
}.space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1rem * var(--space-x-reverse));margin-left:calc(1rem * calc(1 - var(--space-x-reverse)))
}.space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.25rem * var(--space-y-reverse))
}.space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.25rem * var(--space-x-reverse));margin-left:calc(1.25rem * calc(1 - var(--space-x-reverse)))
}.space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem * var(--space-y-reverse))
}.space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.5rem * var(--space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--space-x-reverse)))
}.space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2rem * var(--space-y-reverse))
}.space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2rem * var(--space-x-reverse));margin-left:calc(2rem * calc(1 - var(--space-x-reverse)))
}.space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2.5rem * var(--space-y-reverse))
}.space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2.5rem * var(--space-x-reverse));margin-left:calc(2.5rem * calc(1 - var(--space-x-reverse)))
}.space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(3rem * var(--space-y-reverse))
}.space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(3rem * var(--space-x-reverse));margin-left:calc(3rem * calc(1 - var(--space-x-reverse)))
}.space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(4rem * var(--space-y-reverse))
}.space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(4rem * var(--space-x-reverse));margin-left:calc(4rem * calc(1 - var(--space-x-reverse)))
}.space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(5rem * var(--space-y-reverse))
}.space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(5rem * var(--space-x-reverse));margin-left:calc(5rem * calc(1 - var(--space-x-reverse)))
}.space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(6rem * var(--space-y-reverse))
}.space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(6rem * var(--space-x-reverse));margin-left:calc(6rem * calc(1 - var(--space-x-reverse)))
}.space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(8rem * var(--space-y-reverse))
}.space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(8rem * var(--space-x-reverse));margin-left:calc(8rem * calc(1 - var(--space-x-reverse)))
}.space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(10rem * var(--space-y-reverse))
}.space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(10rem * var(--space-x-reverse));margin-left:calc(10rem * calc(1 - var(--space-x-reverse)))
}.space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(12rem * var(--space-y-reverse))
}.space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(12rem * var(--space-x-reverse));margin-left:calc(12rem * calc(1 - var(--space-x-reverse)))
}.space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(14rem * var(--space-y-reverse))
}.space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(14rem * var(--space-x-reverse));margin-left:calc(14rem * calc(1 - var(--space-x-reverse)))
}.space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(16rem * var(--space-y-reverse))
}.space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(16rem * var(--space-x-reverse));margin-left:calc(16rem * calc(1 - var(--space-x-reverse)))
}.space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1px * var(--space-y-reverse))
}.space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1px * var(--space-x-reverse));margin-left:calc(1px * calc(1 - var(--space-x-reverse)))
}.-space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.25rem * var(--space-y-reverse))
}.-space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.25rem * var(--space-x-reverse));margin-left:calc(-0.25rem * calc(1 - var(--space-x-reverse)))
}.-space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.5rem * var(--space-y-reverse))
}.-space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.5rem * var(--space-x-reverse));margin-left:calc(-0.5rem * calc(1 - var(--space-x-reverse)))
}.-space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.75rem * var(--space-y-reverse))
}.-space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.75rem * var(--space-x-reverse));margin-left:calc(-0.75rem * calc(1 - var(--space-x-reverse)))
}.-space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1rem * var(--space-y-reverse))
}.-space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1rem * var(--space-x-reverse));margin-left:calc(-1rem * calc(1 - var(--space-x-reverse)))
}.-space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.25rem * var(--space-y-reverse))
}.-space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.25rem * var(--space-x-reverse));margin-left:calc(-1.25rem * calc(1 - var(--space-x-reverse)))
}.-space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.5rem * var(--space-y-reverse))
}.-space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.5rem * var(--space-x-reverse));margin-left:calc(-1.5rem * calc(1 - var(--space-x-reverse)))
}.-space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2rem * var(--space-y-reverse))
}.-space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2rem * var(--space-x-reverse));margin-left:calc(-2rem * calc(1 - var(--space-x-reverse)))
}.-space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2.5rem * var(--space-y-reverse))
}.-space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2.5rem * var(--space-x-reverse));margin-left:calc(-2.5rem * calc(1 - var(--space-x-reverse)))
}.-space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-3rem * var(--space-y-reverse))
}.-space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-3rem * var(--space-x-reverse));margin-left:calc(-3rem * calc(1 - var(--space-x-reverse)))
}.-space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-4rem * var(--space-y-reverse))
}.-space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-4rem * var(--space-x-reverse));margin-left:calc(-4rem * calc(1 - var(--space-x-reverse)))
}.-space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-5rem * var(--space-y-reverse))
}.-space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-5rem * var(--space-x-reverse));margin-left:calc(-5rem * calc(1 - var(--space-x-reverse)))
}.-space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-6rem * var(--space-y-reverse))
}.-space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-6rem * var(--space-x-reverse));margin-left:calc(-6rem * calc(1 - var(--space-x-reverse)))
}.-space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-8rem * var(--space-y-reverse))
}.-space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-8rem * var(--space-x-reverse));margin-left:calc(-8rem * calc(1 - var(--space-x-reverse)))
}.-space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-10rem * var(--space-y-reverse))
}.-space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-10rem * var(--space-x-reverse));margin-left:calc(-10rem * calc(1 - var(--space-x-reverse)))
}.-space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-12rem * var(--space-y-reverse))
}.-space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-12rem * var(--space-x-reverse));margin-left:calc(-12rem * calc(1 - var(--space-x-reverse)))
}.-space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-14rem * var(--space-y-reverse))
}.-space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-14rem * var(--space-x-reverse));margin-left:calc(-14rem * calc(1 - var(--space-x-reverse)))
}.-space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-16rem * var(--space-y-reverse))
}.-space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-16rem * var(--space-x-reverse));margin-left:calc(-16rem * calc(1 - var(--space-x-reverse)))
}.-space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1px * var(--space-y-reverse))
}.-space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1px * var(--space-x-reverse));margin-left:calc(-1px * calc(1 - var(--space-x-reverse)))
}.space-y-reverse>:not(template)~:not(template){--space-y-reverse:1
}.space-x-reverse>:not(template)~:not(template){--space-x-reverse:1
}.divide-y-0>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(0px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(0px * var(--divide-y-reverse))
}.divide-x-0>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(0px * var(--divide-x-reverse));border-left-width:calc(0px * calc(1 - var(--divide-x-reverse)))
}.divide-y-2>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(2px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(2px * var(--divide-y-reverse))
}.divide-x-2>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(2px * var(--divide-x-reverse));border-left-width:calc(2px * calc(1 - var(--divide-x-reverse)))
}.divide-y-4>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(4px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(4px * var(--divide-y-reverse))
}.divide-x-4>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(4px * var(--divide-x-reverse));border-left-width:calc(4px * calc(1 - var(--divide-x-reverse)))
}.divide-y-8>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(8px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(8px * var(--divide-y-reverse))
}.divide-x-8>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(8px * var(--divide-x-reverse));border-left-width:calc(8px * calc(1 - var(--divide-x-reverse)))
}.divide-y>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(1px * var(--divide-y-reverse))
}.divide-x>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(1px * var(--divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--divide-x-reverse)))
}.divide-y-reverse>:not(template)~:not(template){--divide-y-reverse:1
}.divide-x-reverse>:not(template)~:not(template){--divide-x-reverse:1
}.divide-transparent>:not(template)~:not(template){border-color:transparent
}.divide-current>:not(template)~:not(template){border-color:currentColor
}.divide-black>:not(template)~:not(template){--divide-opacity:1;border-color:#000;border-color:rgba(0, 0, 0, var(--divide-opacity))
}.divide-white>:not(template)~:not(template){--divide-opacity:1;border-color:#fff;border-color:rgba(255, 255, 255, var(--divide-opacity))
}.divide-gray-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f7fafc;border-color:rgba(247, 250, 252, var(--divide-opacity))
}.divide-gray-200>:not(template)~:not(template){--divide-opacity:1;border-color:#edf2f7;border-color:rgba(237, 242, 247, var(--divide-opacity))
}.divide-gray-300>:not(template)~:not(template){--divide-opacity:1;border-color:#e2e8f0;border-color:rgba(226, 232, 240, var(--divide-opacity))
}.divide-gray-400>:not(template)~:not(template){--divide-opacity:1;border-color:#cbd5e0;border-color:rgba(203, 213, 224, var(--divide-opacity))
}.divide-gray-500>:not(template)~:not(template){--divide-opacity:1;border-color:#a0aec0;border-color:rgba(160, 174, 192, var(--divide-opacity))
}.divide-gray-600>:not(template)~:not(template){--divide-opacity:1;border-color:#718096;border-color:rgba(113, 128, 150, var(--divide-opacity))
}.divide-gray-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4a5568;border-color:rgba(74, 85, 104, var(--divide-opacity))
}.divide-gray-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2d3748;border-color:rgba(45, 55, 72, var(--divide-opacity))
}.divide-gray-900>:not(template)~:not(template){--divide-opacity:1;border-color:#1a202c;border-color:rgba(26, 32, 44, var(--divide-opacity))
}.divide-red-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f5;border-color:rgba(255, 245, 245, var(--divide-opacity))
}.divide-red-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7d7;border-color:rgba(254, 215, 215, var(--divide-opacity))
}.divide-red-300>:not(template)~:not(template){--divide-opacity:1;border-color:#feb2b2;border-color:rgba(254, 178, 178, var(--divide-opacity))
}.divide-red-400>:not(template)~:not(template){--divide-opacity:1;border-color:#fc8181;border-color:rgba(252, 129, 129, var(--divide-opacity))
}.divide-red-500>:not(template)~:not(template){--divide-opacity:1;border-color:#f56565;border-color:rgba(245, 101, 101, var(--divide-opacity))
}.divide-red-600>:not(template)~:not(template){--divide-opacity:1;border-color:#e53e3e;border-color:rgba(229, 62, 62, var(--divide-opacity))
}.divide-red-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c53030;border-color:rgba(197, 48, 48, var(--divide-opacity))
}.divide-red-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9b2c2c;border-color:rgba(155, 44, 44, var(--divide-opacity))
}.divide-red-900>:not(template)~:not(template){--divide-opacity:1;border-color:#742a2a;border-color:rgba(116, 42, 42, var(--divide-opacity))
}.divide-orange-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffaf0;border-color:rgba(255, 250, 240, var(--divide-opacity))
}.divide-orange-200>:not(template)~:not(template){--divide-opacity:1;border-color:#feebc8;border-color:rgba(254, 235, 200, var(--divide-opacity))
}.divide-orange-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbd38d;border-color:rgba(251, 211, 141, var(--divide-opacity))
}.divide-orange-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6ad55;border-color:rgba(246, 173, 85, var(--divide-opacity))
}.divide-orange-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed8936;border-color:rgba(237, 137, 54, var(--divide-opacity))
}.divide-orange-600>:not(template)~:not(template){--divide-opacity:1;border-color:#dd6b20;border-color:rgba(221, 107, 32, var(--divide-opacity))
}.divide-orange-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c05621;border-color:rgba(192, 86, 33, var(--divide-opacity))
}.divide-orange-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9c4221;border-color:rgba(156, 66, 33, var(--divide-opacity))
}.divide-orange-900>:not(template)~:not(template){--divide-opacity:1;border-color:#7b341e;border-color:rgba(123, 52, 30, var(--divide-opacity))
}.divide-yellow-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffff0;border-color:rgba(255, 255, 240, var(--divide-opacity))
}.divide-yellow-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fefcbf;border-color:rgba(254, 252, 191, var(--divide-opacity))
}.divide-yellow-300>:not(template)~:not(template){--divide-opacity:1;border-color:#faf089;border-color:rgba(250, 240, 137, var(--divide-opacity))
}.divide-yellow-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6e05e;border-color:rgba(246, 224, 94, var(--divide-opacity))
}.divide-yellow-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ecc94b;border-color:rgba(236, 201, 75, var(--divide-opacity))
}.divide-yellow-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d69e2e;border-color:rgba(214, 158, 46, var(--divide-opacity))
}.divide-yellow-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b7791f;border-color:rgba(183, 121, 31, var(--divide-opacity))
}.divide-yellow-800>:not(template)~:not(template){--divide-opacity:1;border-color:#975a16;border-color:rgba(151, 90, 22, var(--divide-opacity))
}.divide-yellow-900>:not(template)~:not(template){--divide-opacity:1;border-color:#744210;border-color:rgba(116, 66, 16, var(--divide-opacity))
}.divide-green-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f0fff4;border-color:rgba(240, 255, 244, var(--divide-opacity))
}.divide-green-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c6f6d5;border-color:rgba(198, 246, 213, var(--divide-opacity))
}.divide-green-300>:not(template)~:not(template){--divide-opacity:1;border-color:#9ae6b4;border-color:rgba(154, 230, 180, var(--divide-opacity))
}.divide-green-400>:not(template)~:not(template){--divide-opacity:1;border-color:#68d391;border-color:rgba(104, 211, 145, var(--divide-opacity))
}.divide-green-500>:not(template)~:not(template){--divide-opacity:1;border-color:#48bb78;border-color:rgba(72, 187, 120, var(--divide-opacity))
}.divide-green-600>:not(template)~:not(template){--divide-opacity:1;border-color:#38a169;border-color:rgba(56, 161, 105, var(--divide-opacity))
}.divide-green-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2f855a;border-color:rgba(47, 133, 90, var(--divide-opacity))
}.divide-green-800>:not(template)~:not(template){--divide-opacity:1;border-color:#276749;border-color:rgba(39, 103, 73, var(--divide-opacity))
}.divide-green-900>:not(template)~:not(template){--divide-opacity:1;border-color:#22543d;border-color:rgba(34, 84, 61, var(--divide-opacity))
}.divide-teal-100>:not(template)~:not(template){--divide-opacity:1;border-color:#e6fffa;border-color:rgba(230, 255, 250, var(--divide-opacity))
}.divide-teal-200>:not(template)~:not(template){--divide-opacity:1;border-color:#b2f5ea;border-color:rgba(178, 245, 234, var(--divide-opacity))
}.divide-teal-300>:not(template)~:not(template){--divide-opacity:1;border-color:#81e6d9;border-color:rgba(129, 230, 217, var(--divide-opacity))
}.divide-teal-400>:not(template)~:not(template){--divide-opacity:1;border-color:#4fd1c5;border-color:rgba(79, 209, 197, var(--divide-opacity))
}.divide-teal-500>:not(template)~:not(template){--divide-opacity:1;border-color:#38b2ac;border-color:rgba(56, 178, 172, var(--divide-opacity))
}.divide-teal-600>:not(template)~:not(template){--divide-opacity:1;border-color:#319795;border-color:rgba(49, 151, 149, var(--divide-opacity))
}.divide-teal-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2c7a7b;border-color:rgba(44, 122, 123, var(--divide-opacity))
}.divide-teal-800>:not(template)~:not(template){--divide-opacity:1;border-color:#285e61;border-color:rgba(40, 94, 97, var(--divide-opacity))
}.divide-teal-900>:not(template)~:not(template){--divide-opacity:1;border-color:#234e52;border-color:rgba(35, 78, 82, var(--divide-opacity))
}.divide-blue-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf8ff;border-color:rgba(235, 248, 255, var(--divide-opacity))
}.divide-blue-200>:not(template)~:not(template){--divide-opacity:1;border-color:#bee3f8;border-color:rgba(190, 227, 248, var(--divide-opacity))
}.divide-blue-300>:not(template)~:not(template){--divide-opacity:1;border-color:#90cdf4;border-color:rgba(144, 205, 244, var(--divide-opacity))
}.divide-blue-400>:not(template)~:not(template){--divide-opacity:1;border-color:#63b3ed;border-color:rgba(99, 179, 237, var(--divide-opacity))
}.divide-blue-500>:not(template)~:not(template){--divide-opacity:1;border-color:#4299e1;border-color:rgba(66, 153, 225, var(--divide-opacity))
}.divide-blue-600>:not(template)~:not(template){--divide-opacity:1;border-color:#3182ce;border-color:rgba(49, 130, 206, var(--divide-opacity))
}.divide-blue-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2b6cb0;border-color:rgba(43, 108, 176, var(--divide-opacity))
}.divide-blue-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2c5282;border-color:rgba(44, 82, 130, var(--divide-opacity))
}.divide-blue-900>:not(template)~:not(template){--divide-opacity:1;border-color:#2a4365;border-color:rgba(42, 67, 101, var(--divide-opacity))
}.divide-indigo-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf4ff;border-color:rgba(235, 244, 255, var(--divide-opacity))
}.divide-indigo-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c3dafe;border-color:rgba(195, 218, 254, var(--divide-opacity))
}.divide-indigo-300>:not(template)~:not(template){--divide-opacity:1;border-color:#a3bffa;border-color:rgba(163, 191, 250, var(--divide-opacity))
}.divide-indigo-400>:not(template)~:not(template){--divide-opacity:1;border-color:#7f9cf5;border-color:rgba(127, 156, 245, var(--divide-opacity))
}.divide-indigo-500>:not(template)~:not(template){--divide-opacity:1;border-color:#667eea;border-color:rgba(102, 126, 234, var(--divide-opacity))
}.divide-indigo-600>:not(template)~:not(template){--divide-opacity:1;border-color:#5a67d8;border-color:rgba(90, 103, 216, var(--divide-opacity))
}.divide-indigo-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4c51bf;border-color:rgba(76, 81, 191, var(--divide-opacity))
}.divide-indigo-800>:not(template)~:not(template){--divide-opacity:1;border-color:#434190;border-color:rgba(67, 65, 144, var(--divide-opacity))
}.divide-indigo-900>:not(template)~:not(template){--divide-opacity:1;border-color:#3c366b;border-color:rgba(60, 54, 107, var(--divide-opacity))
}.divide-purple-100>:not(template)~:not(template){--divide-opacity:1;border-color:#faf5ff;border-color:rgba(250, 245, 255, var(--divide-opacity))
}.divide-purple-200>:not(template)~:not(template){--divide-opacity:1;border-color:#e9d8fd;border-color:rgba(233, 216, 253, var(--divide-opacity))
}.divide-purple-300>:not(template)~:not(template){--divide-opacity:1;border-color:#d6bcfa;border-color:rgba(214, 188, 250, var(--divide-opacity))
}.divide-purple-400>:not(template)~:not(template){--divide-opacity:1;border-color:#b794f4;border-color:rgba(183, 148, 244, var(--divide-opacity))
}.divide-purple-500>:not(template)~:not(template){--divide-opacity:1;border-color:#9f7aea;border-color:rgba(159, 122, 234, var(--divide-opacity))
}.divide-purple-600>:not(template)~:not(template){--divide-opacity:1;border-color:#805ad5;border-color:rgba(128, 90, 213, var(--divide-opacity))
}.divide-purple-700>:not(template)~:not(template){--divide-opacity:1;border-color:#6b46c1;border-color:rgba(107, 70, 193, var(--divide-opacity))
}.divide-purple-800>:not(template)~:not(template){--divide-opacity:1;border-color:#553c9a;border-color:rgba(85, 60, 154, var(--divide-opacity))
}.divide-purple-900>:not(template)~:not(template){--divide-opacity:1;border-color:#44337a;border-color:rgba(68, 51, 122, var(--divide-opacity))
}.divide-pink-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f7;border-color:rgba(255, 245, 247, var(--divide-opacity))
}.divide-pink-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7e2;border-color:rgba(254, 215, 226, var(--divide-opacity))
}.divide-pink-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbb6ce;border-color:rgba(251, 182, 206, var(--divide-opacity))
}.divide-pink-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f687b3;border-color:rgba(246, 135, 179, var(--divide-opacity))
}.divide-pink-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed64a6;border-color:rgba(237, 100, 166, var(--divide-opacity))
}.divide-pink-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d53f8c;border-color:rgba(213, 63, 140, var(--divide-opacity))
}.divide-pink-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b83280;border-color:rgba(184, 50, 128, var(--divide-opacity))
}.divide-pink-800>:not(template)~:not(template){--divide-opacity:1;border-color:#97266d;border-color:rgba(151, 38, 109, var(--divide-opacity))
}.divide-pink-900>:not(template)~:not(template){--divide-opacity:1;border-color:#702459;border-color:rgba(112, 36, 89, var(--divide-opacity))
}.divide-primary>:not(template)~:not(template){--divide-opacity:1;border-color:#233D81;border-color:rgba(35, 61, 129, var(--divide-opacity))
}.divide-secondary>:not(template)~:not(template){--divide-opacity:1;border-color:#1C8FC0;border-color:rgba(28, 143, 192, var(--divide-opacity))
}.divide-tertiary>:not(template)~:not(template){--divide-opacity:1;border-color:#2AD78B;border-color:rgba(42, 215, 139, var(--divide-opacity))
}.divide-dark>:not(template)~:not(template){--divide-opacity:1;border-color:#03174B;border-color:rgba(3, 23, 75, var(--divide-opacity))
}.divide-smoke-darkest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.9)
}.divide-smoke-darker>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.75)
}.divide-smoke-dark>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.6)
}.divide-smoke>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.5)
}.divide-smoke-light>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.4)
}.divide-smoke-lighter>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.25)
}.divide-smoke-lightest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.1)
}.divide-opacity-0>:not(template)~:not(template){--divide-opacity:0
}.divide-opacity-25>:not(template)~:not(template){--divide-opacity:0.25
}.divide-opacity-50>:not(template)~:not(template){--divide-opacity:0.5
}.divide-opacity-75>:not(template)~:not(template){--divide-opacity:0.75
}.divide-opacity-100>:not(template)~:not(template){--divide-opacity:1
}.bg-white{--bg-opacity:1;background-color:#fff;background-color:rgba(255, 255, 255, var(--bg-opacity))
}.rounded-lg{border-radius:0.5rem
}.rounded-full{border-radius:9999px
}.rounded-b-none{border-bottom-right-radius:0;border-bottom-left-radius:0
}.flex{display:flex
}.items-center{align-items:center
}.justify-between{justify-content:space-between
}.font-bold{font-weight:700
}.h-6{height:1.5rem
}.h-12{height:3rem
}.h-64{height:16rem
}.text-xs{font-size:0.75rem
}.text-sm{font-size:0.875rem
}.text-2xl{font-size:1.5rem
}.my-3{margin-top:0.75rem;margin-bottom:0.75rem
}.mx-4{margin-left:1rem;margin-right:1rem
}.mx-6{margin-left:1.5rem;margin-right:1.5rem
}.my-20{margin-top:5rem;margin-bottom:5rem
}.mx-auto{margin-left:auto;margin-right:auto
}.mr-1{margin-right:0.25rem
}.mt-2{margin-top:0.5rem
}.mb-6{margin-bottom:1.5rem
}.-ml-3{margin-left:-0.75rem
}.max-w-xl{max-width:36rem
}.object-cover{object-fit:cover
}.py-2{padding-top:0.5rem;padding-bottom:0.5rem
}.px-2{padding-left:0.5rem;padding-right:0.5rem
}.px-4{padding-left:1rem;padding-right:1rem
}.py-8{padding-top:2rem;padding-bottom:2rem
}.shadow{box-shadow:0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
}.shadow-2xl{box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.25)
}.text-gray-600{--text-opacity:1;color:#718096;color:rgba(113, 128, 150, var(--text-opacity))
}.text-gray-700{--text-opacity:1;color:#4a5568;color:rgba(74, 85, 104, var(--text-opacity))
}.text-gray-800{--text-opacity:1;color:#2d3748;color:rgba(45, 55, 72, var(--text-opacity))
}.text-gray-900{--text-opacity:1;color:#1a202c;color:rgba(26, 32, 44, var(--text-opacity))
}.text-blue-500{--text-opacity:1;color:#4299e1;color:rgba(66, 153, 225, var(--text-opacity))
}.tracking-tighter{letter-spacing:-0.05em
}.tracking-normal{letter-spacing:0
}.tracking-wide{letter-spacing:0.025em
}.w-6{width:1.5rem
}.w-12{width:3rem
}.w-full{width:100%
}@media(min-width: 640px){.sm\\:space-y-0>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0px * var(--space-y-reverse))
  }.sm\\:space-x-0>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0px * var(--space-x-reverse));margin-left:calc(0px * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.25rem * var(--space-y-reverse))
  }.sm\\:space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.25rem * var(--space-x-reverse));margin-left:calc(0.25rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.5rem * var(--space-y-reverse))
  }.sm\\:space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.5rem * var(--space-x-reverse));margin-left:calc(0.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.75rem * var(--space-y-reverse))
  }.sm\\:space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.75rem * var(--space-x-reverse));margin-left:calc(0.75rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem * var(--space-y-reverse))
  }.sm\\:space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1rem * var(--space-x-reverse));margin-left:calc(1rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.25rem * var(--space-y-reverse))
  }.sm\\:space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.25rem * var(--space-x-reverse));margin-left:calc(1.25rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem * var(--space-y-reverse))
  }.sm\\:space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.5rem * var(--space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2rem * var(--space-y-reverse))
  }.sm\\:space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2rem * var(--space-x-reverse));margin-left:calc(2rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2.5rem * var(--space-y-reverse))
  }.sm\\:space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2.5rem * var(--space-x-reverse));margin-left:calc(2.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(3rem * var(--space-y-reverse))
  }.sm\\:space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(3rem * var(--space-x-reverse));margin-left:calc(3rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(4rem * var(--space-y-reverse))
  }.sm\\:space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(4rem * var(--space-x-reverse));margin-left:calc(4rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(5rem * var(--space-y-reverse))
  }.sm\\:space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(5rem * var(--space-x-reverse));margin-left:calc(5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(6rem * var(--space-y-reverse))
  }.sm\\:space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(6rem * var(--space-x-reverse));margin-left:calc(6rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(8rem * var(--space-y-reverse))
  }.sm\\:space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(8rem * var(--space-x-reverse));margin-left:calc(8rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(10rem * var(--space-y-reverse))
  }.sm\\:space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(10rem * var(--space-x-reverse));margin-left:calc(10rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(12rem * var(--space-y-reverse))
  }.sm\\:space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(12rem * var(--space-x-reverse));margin-left:calc(12rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(14rem * var(--space-y-reverse))
  }.sm\\:space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(14rem * var(--space-x-reverse));margin-left:calc(14rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(16rem * var(--space-y-reverse))
  }.sm\\:space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(16rem * var(--space-x-reverse));margin-left:calc(16rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1px * var(--space-y-reverse))
  }.sm\\:space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1px * var(--space-x-reverse));margin-left:calc(1px * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.25rem * var(--space-y-reverse))
  }.sm\\:-space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.25rem * var(--space-x-reverse));margin-left:calc(-0.25rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.5rem * var(--space-y-reverse))
  }.sm\\:-space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.5rem * var(--space-x-reverse));margin-left:calc(-0.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.75rem * var(--space-y-reverse))
  }.sm\\:-space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.75rem * var(--space-x-reverse));margin-left:calc(-0.75rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1rem * var(--space-y-reverse))
  }.sm\\:-space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1rem * var(--space-x-reverse));margin-left:calc(-1rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.25rem * var(--space-y-reverse))
  }.sm\\:-space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.25rem * var(--space-x-reverse));margin-left:calc(-1.25rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.5rem * var(--space-y-reverse))
  }.sm\\:-space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.5rem * var(--space-x-reverse));margin-left:calc(-1.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2rem * var(--space-y-reverse))
  }.sm\\:-space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2rem * var(--space-x-reverse));margin-left:calc(-2rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2.5rem * var(--space-y-reverse))
  }.sm\\:-space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2.5rem * var(--space-x-reverse));margin-left:calc(-2.5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-3rem * var(--space-y-reverse))
  }.sm\\:-space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-3rem * var(--space-x-reverse));margin-left:calc(-3rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-4rem * var(--space-y-reverse))
  }.sm\\:-space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-4rem * var(--space-x-reverse));margin-left:calc(-4rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-5rem * var(--space-y-reverse))
  }.sm\\:-space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-5rem * var(--space-x-reverse));margin-left:calc(-5rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-6rem * var(--space-y-reverse))
  }.sm\\:-space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-6rem * var(--space-x-reverse));margin-left:calc(-6rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-8rem * var(--space-y-reverse))
  }.sm\\:-space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-8rem * var(--space-x-reverse));margin-left:calc(-8rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-10rem * var(--space-y-reverse))
  }.sm\\:-space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-10rem * var(--space-x-reverse));margin-left:calc(-10rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-12rem * var(--space-y-reverse))
  }.sm\\:-space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-12rem * var(--space-x-reverse));margin-left:calc(-12rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-14rem * var(--space-y-reverse))
  }.sm\\:-space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-14rem * var(--space-x-reverse));margin-left:calc(-14rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-16rem * var(--space-y-reverse))
  }.sm\\:-space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-16rem * var(--space-x-reverse));margin-left:calc(-16rem * calc(1 - var(--space-x-reverse)))
  }.sm\\:-space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1px * var(--space-y-reverse))
  }.sm\\:-space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1px * var(--space-x-reverse));margin-left:calc(-1px * calc(1 - var(--space-x-reverse)))
  }.sm\\:space-y-reverse>:not(template)~:not(template){--space-y-reverse:1
  }.sm\\:space-x-reverse>:not(template)~:not(template){--space-x-reverse:1
  }.sm\\:divide-y-0>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(0px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(0px * var(--divide-y-reverse))
  }.sm\\:divide-x-0>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(0px * var(--divide-x-reverse));border-left-width:calc(0px * calc(1 - var(--divide-x-reverse)))
  }.sm\\:divide-y-2>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(2px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(2px * var(--divide-y-reverse))
  }.sm\\:divide-x-2>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(2px * var(--divide-x-reverse));border-left-width:calc(2px * calc(1 - var(--divide-x-reverse)))
  }.sm\\:divide-y-4>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(4px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(4px * var(--divide-y-reverse))
  }.sm\\:divide-x-4>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(4px * var(--divide-x-reverse));border-left-width:calc(4px * calc(1 - var(--divide-x-reverse)))
  }.sm\\:divide-y-8>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(8px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(8px * var(--divide-y-reverse))
  }.sm\\:divide-x-8>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(8px * var(--divide-x-reverse));border-left-width:calc(8px * calc(1 - var(--divide-x-reverse)))
  }.sm\\:divide-y>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(1px * var(--divide-y-reverse))
  }.sm\\:divide-x>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(1px * var(--divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--divide-x-reverse)))
  }.sm\\:divide-y-reverse>:not(template)~:not(template){--divide-y-reverse:1
  }.sm\\:divide-x-reverse>:not(template)~:not(template){--divide-x-reverse:1
  }.sm\\:divide-transparent>:not(template)~:not(template){border-color:transparent
  }.sm\\:divide-current>:not(template)~:not(template){border-color:currentColor
  }.sm\\:divide-black>:not(template)~:not(template){--divide-opacity:1;border-color:#000;border-color:rgba(0, 0, 0, var(--divide-opacity))
  }.sm\\:divide-white>:not(template)~:not(template){--divide-opacity:1;border-color:#fff;border-color:rgba(255, 255, 255, var(--divide-opacity))
  }.sm\\:divide-gray-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f7fafc;border-color:rgba(247, 250, 252, var(--divide-opacity))
  }.sm\\:divide-gray-200>:not(template)~:not(template){--divide-opacity:1;border-color:#edf2f7;border-color:rgba(237, 242, 247, var(--divide-opacity))
  }.sm\\:divide-gray-300>:not(template)~:not(template){--divide-opacity:1;border-color:#e2e8f0;border-color:rgba(226, 232, 240, var(--divide-opacity))
  }.sm\\:divide-gray-400>:not(template)~:not(template){--divide-opacity:1;border-color:#cbd5e0;border-color:rgba(203, 213, 224, var(--divide-opacity))
  }.sm\\:divide-gray-500>:not(template)~:not(template){--divide-opacity:1;border-color:#a0aec0;border-color:rgba(160, 174, 192, var(--divide-opacity))
  }.sm\\:divide-gray-600>:not(template)~:not(template){--divide-opacity:1;border-color:#718096;border-color:rgba(113, 128, 150, var(--divide-opacity))
  }.sm\\:divide-gray-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4a5568;border-color:rgba(74, 85, 104, var(--divide-opacity))
  }.sm\\:divide-gray-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2d3748;border-color:rgba(45, 55, 72, var(--divide-opacity))
  }.sm\\:divide-gray-900>:not(template)~:not(template){--divide-opacity:1;border-color:#1a202c;border-color:rgba(26, 32, 44, var(--divide-opacity))
  }.sm\\:divide-red-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f5;border-color:rgba(255, 245, 245, var(--divide-opacity))
  }.sm\\:divide-red-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7d7;border-color:rgba(254, 215, 215, var(--divide-opacity))
  }.sm\\:divide-red-300>:not(template)~:not(template){--divide-opacity:1;border-color:#feb2b2;border-color:rgba(254, 178, 178, var(--divide-opacity))
  }.sm\\:divide-red-400>:not(template)~:not(template){--divide-opacity:1;border-color:#fc8181;border-color:rgba(252, 129, 129, var(--divide-opacity))
  }.sm\\:divide-red-500>:not(template)~:not(template){--divide-opacity:1;border-color:#f56565;border-color:rgba(245, 101, 101, var(--divide-opacity))
  }.sm\\:divide-red-600>:not(template)~:not(template){--divide-opacity:1;border-color:#e53e3e;border-color:rgba(229, 62, 62, var(--divide-opacity))
  }.sm\\:divide-red-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c53030;border-color:rgba(197, 48, 48, var(--divide-opacity))
  }.sm\\:divide-red-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9b2c2c;border-color:rgba(155, 44, 44, var(--divide-opacity))
  }.sm\\:divide-red-900>:not(template)~:not(template){--divide-opacity:1;border-color:#742a2a;border-color:rgba(116, 42, 42, var(--divide-opacity))
  }.sm\\:divide-orange-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffaf0;border-color:rgba(255, 250, 240, var(--divide-opacity))
  }.sm\\:divide-orange-200>:not(template)~:not(template){--divide-opacity:1;border-color:#feebc8;border-color:rgba(254, 235, 200, var(--divide-opacity))
  }.sm\\:divide-orange-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbd38d;border-color:rgba(251, 211, 141, var(--divide-opacity))
  }.sm\\:divide-orange-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6ad55;border-color:rgba(246, 173, 85, var(--divide-opacity))
  }.sm\\:divide-orange-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed8936;border-color:rgba(237, 137, 54, var(--divide-opacity))
  }.sm\\:divide-orange-600>:not(template)~:not(template){--divide-opacity:1;border-color:#dd6b20;border-color:rgba(221, 107, 32, var(--divide-opacity))
  }.sm\\:divide-orange-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c05621;border-color:rgba(192, 86, 33, var(--divide-opacity))
  }.sm\\:divide-orange-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9c4221;border-color:rgba(156, 66, 33, var(--divide-opacity))
  }.sm\\:divide-orange-900>:not(template)~:not(template){--divide-opacity:1;border-color:#7b341e;border-color:rgba(123, 52, 30, var(--divide-opacity))
  }.sm\\:divide-yellow-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffff0;border-color:rgba(255, 255, 240, var(--divide-opacity))
  }.sm\\:divide-yellow-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fefcbf;border-color:rgba(254, 252, 191, var(--divide-opacity))
  }.sm\\:divide-yellow-300>:not(template)~:not(template){--divide-opacity:1;border-color:#faf089;border-color:rgba(250, 240, 137, var(--divide-opacity))
  }.sm\\:divide-yellow-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6e05e;border-color:rgba(246, 224, 94, var(--divide-opacity))
  }.sm\\:divide-yellow-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ecc94b;border-color:rgba(236, 201, 75, var(--divide-opacity))
  }.sm\\:divide-yellow-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d69e2e;border-color:rgba(214, 158, 46, var(--divide-opacity))
  }.sm\\:divide-yellow-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b7791f;border-color:rgba(183, 121, 31, var(--divide-opacity))
  }.sm\\:divide-yellow-800>:not(template)~:not(template){--divide-opacity:1;border-color:#975a16;border-color:rgba(151, 90, 22, var(--divide-opacity))
  }.sm\\:divide-yellow-900>:not(template)~:not(template){--divide-opacity:1;border-color:#744210;border-color:rgba(116, 66, 16, var(--divide-opacity))
  }.sm\\:divide-green-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f0fff4;border-color:rgba(240, 255, 244, var(--divide-opacity))
  }.sm\\:divide-green-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c6f6d5;border-color:rgba(198, 246, 213, var(--divide-opacity))
  }.sm\\:divide-green-300>:not(template)~:not(template){--divide-opacity:1;border-color:#9ae6b4;border-color:rgba(154, 230, 180, var(--divide-opacity))
  }.sm\\:divide-green-400>:not(template)~:not(template){--divide-opacity:1;border-color:#68d391;border-color:rgba(104, 211, 145, var(--divide-opacity))
  }.sm\\:divide-green-500>:not(template)~:not(template){--divide-opacity:1;border-color:#48bb78;border-color:rgba(72, 187, 120, var(--divide-opacity))
  }.sm\\:divide-green-600>:not(template)~:not(template){--divide-opacity:1;border-color:#38a169;border-color:rgba(56, 161, 105, var(--divide-opacity))
  }.sm\\:divide-green-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2f855a;border-color:rgba(47, 133, 90, var(--divide-opacity))
  }.sm\\:divide-green-800>:not(template)~:not(template){--divide-opacity:1;border-color:#276749;border-color:rgba(39, 103, 73, var(--divide-opacity))
  }.sm\\:divide-green-900>:not(template)~:not(template){--divide-opacity:1;border-color:#22543d;border-color:rgba(34, 84, 61, var(--divide-opacity))
  }.sm\\:divide-teal-100>:not(template)~:not(template){--divide-opacity:1;border-color:#e6fffa;border-color:rgba(230, 255, 250, var(--divide-opacity))
  }.sm\\:divide-teal-200>:not(template)~:not(template){--divide-opacity:1;border-color:#b2f5ea;border-color:rgba(178, 245, 234, var(--divide-opacity))
  }.sm\\:divide-teal-300>:not(template)~:not(template){--divide-opacity:1;border-color:#81e6d9;border-color:rgba(129, 230, 217, var(--divide-opacity))
  }.sm\\:divide-teal-400>:not(template)~:not(template){--divide-opacity:1;border-color:#4fd1c5;border-color:rgba(79, 209, 197, var(--divide-opacity))
  }.sm\\:divide-teal-500>:not(template)~:not(template){--divide-opacity:1;border-color:#38b2ac;border-color:rgba(56, 178, 172, var(--divide-opacity))
  }.sm\\:divide-teal-600>:not(template)~:not(template){--divide-opacity:1;border-color:#319795;border-color:rgba(49, 151, 149, var(--divide-opacity))
  }.sm\\:divide-teal-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2c7a7b;border-color:rgba(44, 122, 123, var(--divide-opacity))
  }.sm\\:divide-teal-800>:not(template)~:not(template){--divide-opacity:1;border-color:#285e61;border-color:rgba(40, 94, 97, var(--divide-opacity))
  }.sm\\:divide-teal-900>:not(template)~:not(template){--divide-opacity:1;border-color:#234e52;border-color:rgba(35, 78, 82, var(--divide-opacity))
  }.sm\\:divide-blue-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf8ff;border-color:rgba(235, 248, 255, var(--divide-opacity))
  }.sm\\:divide-blue-200>:not(template)~:not(template){--divide-opacity:1;border-color:#bee3f8;border-color:rgba(190, 227, 248, var(--divide-opacity))
  }.sm\\:divide-blue-300>:not(template)~:not(template){--divide-opacity:1;border-color:#90cdf4;border-color:rgba(144, 205, 244, var(--divide-opacity))
  }.sm\\:divide-blue-400>:not(template)~:not(template){--divide-opacity:1;border-color:#63b3ed;border-color:rgba(99, 179, 237, var(--divide-opacity))
  }.sm\\:divide-blue-500>:not(template)~:not(template){--divide-opacity:1;border-color:#4299e1;border-color:rgba(66, 153, 225, var(--divide-opacity))
  }.sm\\:divide-blue-600>:not(template)~:not(template){--divide-opacity:1;border-color:#3182ce;border-color:rgba(49, 130, 206, var(--divide-opacity))
  }.sm\\:divide-blue-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2b6cb0;border-color:rgba(43, 108, 176, var(--divide-opacity))
  }.sm\\:divide-blue-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2c5282;border-color:rgba(44, 82, 130, var(--divide-opacity))
  }.sm\\:divide-blue-900>:not(template)~:not(template){--divide-opacity:1;border-color:#2a4365;border-color:rgba(42, 67, 101, var(--divide-opacity))
  }.sm\\:divide-indigo-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf4ff;border-color:rgba(235, 244, 255, var(--divide-opacity))
  }.sm\\:divide-indigo-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c3dafe;border-color:rgba(195, 218, 254, var(--divide-opacity))
  }.sm\\:divide-indigo-300>:not(template)~:not(template){--divide-opacity:1;border-color:#a3bffa;border-color:rgba(163, 191, 250, var(--divide-opacity))
  }.sm\\:divide-indigo-400>:not(template)~:not(template){--divide-opacity:1;border-color:#7f9cf5;border-color:rgba(127, 156, 245, var(--divide-opacity))
  }.sm\\:divide-indigo-500>:not(template)~:not(template){--divide-opacity:1;border-color:#667eea;border-color:rgba(102, 126, 234, var(--divide-opacity))
  }.sm\\:divide-indigo-600>:not(template)~:not(template){--divide-opacity:1;border-color:#5a67d8;border-color:rgba(90, 103, 216, var(--divide-opacity))
  }.sm\\:divide-indigo-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4c51bf;border-color:rgba(76, 81, 191, var(--divide-opacity))
  }.sm\\:divide-indigo-800>:not(template)~:not(template){--divide-opacity:1;border-color:#434190;border-color:rgba(67, 65, 144, var(--divide-opacity))
  }.sm\\:divide-indigo-900>:not(template)~:not(template){--divide-opacity:1;border-color:#3c366b;border-color:rgba(60, 54, 107, var(--divide-opacity))
  }.sm\\:divide-purple-100>:not(template)~:not(template){--divide-opacity:1;border-color:#faf5ff;border-color:rgba(250, 245, 255, var(--divide-opacity))
  }.sm\\:divide-purple-200>:not(template)~:not(template){--divide-opacity:1;border-color:#e9d8fd;border-color:rgba(233, 216, 253, var(--divide-opacity))
  }.sm\\:divide-purple-300>:not(template)~:not(template){--divide-opacity:1;border-color:#d6bcfa;border-color:rgba(214, 188, 250, var(--divide-opacity))
  }.sm\\:divide-purple-400>:not(template)~:not(template){--divide-opacity:1;border-color:#b794f4;border-color:rgba(183, 148, 244, var(--divide-opacity))
  }.sm\\:divide-purple-500>:not(template)~:not(template){--divide-opacity:1;border-color:#9f7aea;border-color:rgba(159, 122, 234, var(--divide-opacity))
  }.sm\\:divide-purple-600>:not(template)~:not(template){--divide-opacity:1;border-color:#805ad5;border-color:rgba(128, 90, 213, var(--divide-opacity))
  }.sm\\:divide-purple-700>:not(template)~:not(template){--divide-opacity:1;border-color:#6b46c1;border-color:rgba(107, 70, 193, var(--divide-opacity))
  }.sm\\:divide-purple-800>:not(template)~:not(template){--divide-opacity:1;border-color:#553c9a;border-color:rgba(85, 60, 154, var(--divide-opacity))
  }.sm\\:divide-purple-900>:not(template)~:not(template){--divide-opacity:1;border-color:#44337a;border-color:rgba(68, 51, 122, var(--divide-opacity))
  }.sm\\:divide-pink-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f7;border-color:rgba(255, 245, 247, var(--divide-opacity))
  }.sm\\:divide-pink-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7e2;border-color:rgba(254, 215, 226, var(--divide-opacity))
  }.sm\\:divide-pink-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbb6ce;border-color:rgba(251, 182, 206, var(--divide-opacity))
  }.sm\\:divide-pink-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f687b3;border-color:rgba(246, 135, 179, var(--divide-opacity))
  }.sm\\:divide-pink-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed64a6;border-color:rgba(237, 100, 166, var(--divide-opacity))
  }.sm\\:divide-pink-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d53f8c;border-color:rgba(213, 63, 140, var(--divide-opacity))
  }.sm\\:divide-pink-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b83280;border-color:rgba(184, 50, 128, var(--divide-opacity))
  }.sm\\:divide-pink-800>:not(template)~:not(template){--divide-opacity:1;border-color:#97266d;border-color:rgba(151, 38, 109, var(--divide-opacity))
  }.sm\\:divide-pink-900>:not(template)~:not(template){--divide-opacity:1;border-color:#702459;border-color:rgba(112, 36, 89, var(--divide-opacity))
  }.sm\\:divide-primary>:not(template)~:not(template){--divide-opacity:1;border-color:#233D81;border-color:rgba(35, 61, 129, var(--divide-opacity))
  }.sm\\:divide-secondary>:not(template)~:not(template){--divide-opacity:1;border-color:#1C8FC0;border-color:rgba(28, 143, 192, var(--divide-opacity))
  }.sm\\:divide-tertiary>:not(template)~:not(template){--divide-opacity:1;border-color:#2AD78B;border-color:rgba(42, 215, 139, var(--divide-opacity))
  }.sm\\:divide-dark>:not(template)~:not(template){--divide-opacity:1;border-color:#03174B;border-color:rgba(3, 23, 75, var(--divide-opacity))
  }.sm\\:divide-smoke-darkest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.9)
  }.sm\\:divide-smoke-darker>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.75)
  }.sm\\:divide-smoke-dark>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.6)
  }.sm\\:divide-smoke>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.5)
  }.sm\\:divide-smoke-light>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.4)
  }.sm\\:divide-smoke-lighter>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.25)
  }.sm\\:divide-smoke-lightest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.1)
  }.sm\\:divide-opacity-0>:not(template)~:not(template){--divide-opacity:0
  }.sm\\:divide-opacity-25>:not(template)~:not(template){--divide-opacity:0.25
  }.sm\\:divide-opacity-50>:not(template)~:not(template){--divide-opacity:0.5
  }.sm\\:divide-opacity-75>:not(template)~:not(template){--divide-opacity:0.75
  }.sm\\:divide-opacity-100>:not(template)~:not(template){--divide-opacity:1
  }}@media(min-width: 768px){.md\\:space-y-0>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0px * var(--space-y-reverse))
  }.md\\:space-x-0>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0px * var(--space-x-reverse));margin-left:calc(0px * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.25rem * var(--space-y-reverse))
  }.md\\:space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.25rem * var(--space-x-reverse));margin-left:calc(0.25rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.5rem * var(--space-y-reverse))
  }.md\\:space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.5rem * var(--space-x-reverse));margin-left:calc(0.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.75rem * var(--space-y-reverse))
  }.md\\:space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.75rem * var(--space-x-reverse));margin-left:calc(0.75rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem * var(--space-y-reverse))
  }.md\\:space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1rem * var(--space-x-reverse));margin-left:calc(1rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.25rem * var(--space-y-reverse))
  }.md\\:space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.25rem * var(--space-x-reverse));margin-left:calc(1.25rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem * var(--space-y-reverse))
  }.md\\:space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.5rem * var(--space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2rem * var(--space-y-reverse))
  }.md\\:space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2rem * var(--space-x-reverse));margin-left:calc(2rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2.5rem * var(--space-y-reverse))
  }.md\\:space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2.5rem * var(--space-x-reverse));margin-left:calc(2.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(3rem * var(--space-y-reverse))
  }.md\\:space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(3rem * var(--space-x-reverse));margin-left:calc(3rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(4rem * var(--space-y-reverse))
  }.md\\:space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(4rem * var(--space-x-reverse));margin-left:calc(4rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(5rem * var(--space-y-reverse))
  }.md\\:space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(5rem * var(--space-x-reverse));margin-left:calc(5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(6rem * var(--space-y-reverse))
  }.md\\:space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(6rem * var(--space-x-reverse));margin-left:calc(6rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(8rem * var(--space-y-reverse))
  }.md\\:space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(8rem * var(--space-x-reverse));margin-left:calc(8rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(10rem * var(--space-y-reverse))
  }.md\\:space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(10rem * var(--space-x-reverse));margin-left:calc(10rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(12rem * var(--space-y-reverse))
  }.md\\:space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(12rem * var(--space-x-reverse));margin-left:calc(12rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(14rem * var(--space-y-reverse))
  }.md\\:space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(14rem * var(--space-x-reverse));margin-left:calc(14rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(16rem * var(--space-y-reverse))
  }.md\\:space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(16rem * var(--space-x-reverse));margin-left:calc(16rem * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1px * var(--space-y-reverse))
  }.md\\:space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1px * var(--space-x-reverse));margin-left:calc(1px * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.25rem * var(--space-y-reverse))
  }.md\\:-space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.25rem * var(--space-x-reverse));margin-left:calc(-0.25rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.5rem * var(--space-y-reverse))
  }.md\\:-space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.5rem * var(--space-x-reverse));margin-left:calc(-0.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.75rem * var(--space-y-reverse))
  }.md\\:-space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.75rem * var(--space-x-reverse));margin-left:calc(-0.75rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1rem * var(--space-y-reverse))
  }.md\\:-space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1rem * var(--space-x-reverse));margin-left:calc(-1rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.25rem * var(--space-y-reverse))
  }.md\\:-space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.25rem * var(--space-x-reverse));margin-left:calc(-1.25rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.5rem * var(--space-y-reverse))
  }.md\\:-space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.5rem * var(--space-x-reverse));margin-left:calc(-1.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2rem * var(--space-y-reverse))
  }.md\\:-space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2rem * var(--space-x-reverse));margin-left:calc(-2rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2.5rem * var(--space-y-reverse))
  }.md\\:-space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2.5rem * var(--space-x-reverse));margin-left:calc(-2.5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-3rem * var(--space-y-reverse))
  }.md\\:-space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-3rem * var(--space-x-reverse));margin-left:calc(-3rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-4rem * var(--space-y-reverse))
  }.md\\:-space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-4rem * var(--space-x-reverse));margin-left:calc(-4rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-5rem * var(--space-y-reverse))
  }.md\\:-space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-5rem * var(--space-x-reverse));margin-left:calc(-5rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-6rem * var(--space-y-reverse))
  }.md\\:-space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-6rem * var(--space-x-reverse));margin-left:calc(-6rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-8rem * var(--space-y-reverse))
  }.md\\:-space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-8rem * var(--space-x-reverse));margin-left:calc(-8rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-10rem * var(--space-y-reverse))
  }.md\\:-space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-10rem * var(--space-x-reverse));margin-left:calc(-10rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-12rem * var(--space-y-reverse))
  }.md\\:-space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-12rem * var(--space-x-reverse));margin-left:calc(-12rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-14rem * var(--space-y-reverse))
  }.md\\:-space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-14rem * var(--space-x-reverse));margin-left:calc(-14rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-16rem * var(--space-y-reverse))
  }.md\\:-space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-16rem * var(--space-x-reverse));margin-left:calc(-16rem * calc(1 - var(--space-x-reverse)))
  }.md\\:-space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1px * var(--space-y-reverse))
  }.md\\:-space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1px * var(--space-x-reverse));margin-left:calc(-1px * calc(1 - var(--space-x-reverse)))
  }.md\\:space-y-reverse>:not(template)~:not(template){--space-y-reverse:1
  }.md\\:space-x-reverse>:not(template)~:not(template){--space-x-reverse:1
  }.md\\:divide-y-0>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(0px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(0px * var(--divide-y-reverse))
  }.md\\:divide-x-0>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(0px * var(--divide-x-reverse));border-left-width:calc(0px * calc(1 - var(--divide-x-reverse)))
  }.md\\:divide-y-2>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(2px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(2px * var(--divide-y-reverse))
  }.md\\:divide-x-2>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(2px * var(--divide-x-reverse));border-left-width:calc(2px * calc(1 - var(--divide-x-reverse)))
  }.md\\:divide-y-4>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(4px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(4px * var(--divide-y-reverse))
  }.md\\:divide-x-4>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(4px * var(--divide-x-reverse));border-left-width:calc(4px * calc(1 - var(--divide-x-reverse)))
  }.md\\:divide-y-8>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(8px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(8px * var(--divide-y-reverse))
  }.md\\:divide-x-8>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(8px * var(--divide-x-reverse));border-left-width:calc(8px * calc(1 - var(--divide-x-reverse)))
  }.md\\:divide-y>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(1px * var(--divide-y-reverse))
  }.md\\:divide-x>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(1px * var(--divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--divide-x-reverse)))
  }.md\\:divide-y-reverse>:not(template)~:not(template){--divide-y-reverse:1
  }.md\\:divide-x-reverse>:not(template)~:not(template){--divide-x-reverse:1
  }.md\\:divide-transparent>:not(template)~:not(template){border-color:transparent
  }.md\\:divide-current>:not(template)~:not(template){border-color:currentColor
  }.md\\:divide-black>:not(template)~:not(template){--divide-opacity:1;border-color:#000;border-color:rgba(0, 0, 0, var(--divide-opacity))
  }.md\\:divide-white>:not(template)~:not(template){--divide-opacity:1;border-color:#fff;border-color:rgba(255, 255, 255, var(--divide-opacity))
  }.md\\:divide-gray-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f7fafc;border-color:rgba(247, 250, 252, var(--divide-opacity))
  }.md\\:divide-gray-200>:not(template)~:not(template){--divide-opacity:1;border-color:#edf2f7;border-color:rgba(237, 242, 247, var(--divide-opacity))
  }.md\\:divide-gray-300>:not(template)~:not(template){--divide-opacity:1;border-color:#e2e8f0;border-color:rgba(226, 232, 240, var(--divide-opacity))
  }.md\\:divide-gray-400>:not(template)~:not(template){--divide-opacity:1;border-color:#cbd5e0;border-color:rgba(203, 213, 224, var(--divide-opacity))
  }.md\\:divide-gray-500>:not(template)~:not(template){--divide-opacity:1;border-color:#a0aec0;border-color:rgba(160, 174, 192, var(--divide-opacity))
  }.md\\:divide-gray-600>:not(template)~:not(template){--divide-opacity:1;border-color:#718096;border-color:rgba(113, 128, 150, var(--divide-opacity))
  }.md\\:divide-gray-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4a5568;border-color:rgba(74, 85, 104, var(--divide-opacity))
  }.md\\:divide-gray-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2d3748;border-color:rgba(45, 55, 72, var(--divide-opacity))
  }.md\\:divide-gray-900>:not(template)~:not(template){--divide-opacity:1;border-color:#1a202c;border-color:rgba(26, 32, 44, var(--divide-opacity))
  }.md\\:divide-red-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f5;border-color:rgba(255, 245, 245, var(--divide-opacity))
  }.md\\:divide-red-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7d7;border-color:rgba(254, 215, 215, var(--divide-opacity))
  }.md\\:divide-red-300>:not(template)~:not(template){--divide-opacity:1;border-color:#feb2b2;border-color:rgba(254, 178, 178, var(--divide-opacity))
  }.md\\:divide-red-400>:not(template)~:not(template){--divide-opacity:1;border-color:#fc8181;border-color:rgba(252, 129, 129, var(--divide-opacity))
  }.md\\:divide-red-500>:not(template)~:not(template){--divide-opacity:1;border-color:#f56565;border-color:rgba(245, 101, 101, var(--divide-opacity))
  }.md\\:divide-red-600>:not(template)~:not(template){--divide-opacity:1;border-color:#e53e3e;border-color:rgba(229, 62, 62, var(--divide-opacity))
  }.md\\:divide-red-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c53030;border-color:rgba(197, 48, 48, var(--divide-opacity))
  }.md\\:divide-red-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9b2c2c;border-color:rgba(155, 44, 44, var(--divide-opacity))
  }.md\\:divide-red-900>:not(template)~:not(template){--divide-opacity:1;border-color:#742a2a;border-color:rgba(116, 42, 42, var(--divide-opacity))
  }.md\\:divide-orange-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffaf0;border-color:rgba(255, 250, 240, var(--divide-opacity))
  }.md\\:divide-orange-200>:not(template)~:not(template){--divide-opacity:1;border-color:#feebc8;border-color:rgba(254, 235, 200, var(--divide-opacity))
  }.md\\:divide-orange-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbd38d;border-color:rgba(251, 211, 141, var(--divide-opacity))
  }.md\\:divide-orange-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6ad55;border-color:rgba(246, 173, 85, var(--divide-opacity))
  }.md\\:divide-orange-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed8936;border-color:rgba(237, 137, 54, var(--divide-opacity))
  }.md\\:divide-orange-600>:not(template)~:not(template){--divide-opacity:1;border-color:#dd6b20;border-color:rgba(221, 107, 32, var(--divide-opacity))
  }.md\\:divide-orange-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c05621;border-color:rgba(192, 86, 33, var(--divide-opacity))
  }.md\\:divide-orange-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9c4221;border-color:rgba(156, 66, 33, var(--divide-opacity))
  }.md\\:divide-orange-900>:not(template)~:not(template){--divide-opacity:1;border-color:#7b341e;border-color:rgba(123, 52, 30, var(--divide-opacity))
  }.md\\:divide-yellow-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffff0;border-color:rgba(255, 255, 240, var(--divide-opacity))
  }.md\\:divide-yellow-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fefcbf;border-color:rgba(254, 252, 191, var(--divide-opacity))
  }.md\\:divide-yellow-300>:not(template)~:not(template){--divide-opacity:1;border-color:#faf089;border-color:rgba(250, 240, 137, var(--divide-opacity))
  }.md\\:divide-yellow-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6e05e;border-color:rgba(246, 224, 94, var(--divide-opacity))
  }.md\\:divide-yellow-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ecc94b;border-color:rgba(236, 201, 75, var(--divide-opacity))
  }.md\\:divide-yellow-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d69e2e;border-color:rgba(214, 158, 46, var(--divide-opacity))
  }.md\\:divide-yellow-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b7791f;border-color:rgba(183, 121, 31, var(--divide-opacity))
  }.md\\:divide-yellow-800>:not(template)~:not(template){--divide-opacity:1;border-color:#975a16;border-color:rgba(151, 90, 22, var(--divide-opacity))
  }.md\\:divide-yellow-900>:not(template)~:not(template){--divide-opacity:1;border-color:#744210;border-color:rgba(116, 66, 16, var(--divide-opacity))
  }.md\\:divide-green-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f0fff4;border-color:rgba(240, 255, 244, var(--divide-opacity))
  }.md\\:divide-green-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c6f6d5;border-color:rgba(198, 246, 213, var(--divide-opacity))
  }.md\\:divide-green-300>:not(template)~:not(template){--divide-opacity:1;border-color:#9ae6b4;border-color:rgba(154, 230, 180, var(--divide-opacity))
  }.md\\:divide-green-400>:not(template)~:not(template){--divide-opacity:1;border-color:#68d391;border-color:rgba(104, 211, 145, var(--divide-opacity))
  }.md\\:divide-green-500>:not(template)~:not(template){--divide-opacity:1;border-color:#48bb78;border-color:rgba(72, 187, 120, var(--divide-opacity))
  }.md\\:divide-green-600>:not(template)~:not(template){--divide-opacity:1;border-color:#38a169;border-color:rgba(56, 161, 105, var(--divide-opacity))
  }.md\\:divide-green-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2f855a;border-color:rgba(47, 133, 90, var(--divide-opacity))
  }.md\\:divide-green-800>:not(template)~:not(template){--divide-opacity:1;border-color:#276749;border-color:rgba(39, 103, 73, var(--divide-opacity))
  }.md\\:divide-green-900>:not(template)~:not(template){--divide-opacity:1;border-color:#22543d;border-color:rgba(34, 84, 61, var(--divide-opacity))
  }.md\\:divide-teal-100>:not(template)~:not(template){--divide-opacity:1;border-color:#e6fffa;border-color:rgba(230, 255, 250, var(--divide-opacity))
  }.md\\:divide-teal-200>:not(template)~:not(template){--divide-opacity:1;border-color:#b2f5ea;border-color:rgba(178, 245, 234, var(--divide-opacity))
  }.md\\:divide-teal-300>:not(template)~:not(template){--divide-opacity:1;border-color:#81e6d9;border-color:rgba(129, 230, 217, var(--divide-opacity))
  }.md\\:divide-teal-400>:not(template)~:not(template){--divide-opacity:1;border-color:#4fd1c5;border-color:rgba(79, 209, 197, var(--divide-opacity))
  }.md\\:divide-teal-500>:not(template)~:not(template){--divide-opacity:1;border-color:#38b2ac;border-color:rgba(56, 178, 172, var(--divide-opacity))
  }.md\\:divide-teal-600>:not(template)~:not(template){--divide-opacity:1;border-color:#319795;border-color:rgba(49, 151, 149, var(--divide-opacity))
  }.md\\:divide-teal-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2c7a7b;border-color:rgba(44, 122, 123, var(--divide-opacity))
  }.md\\:divide-teal-800>:not(template)~:not(template){--divide-opacity:1;border-color:#285e61;border-color:rgba(40, 94, 97, var(--divide-opacity))
  }.md\\:divide-teal-900>:not(template)~:not(template){--divide-opacity:1;border-color:#234e52;border-color:rgba(35, 78, 82, var(--divide-opacity))
  }.md\\:divide-blue-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf8ff;border-color:rgba(235, 248, 255, var(--divide-opacity))
  }.md\\:divide-blue-200>:not(template)~:not(template){--divide-opacity:1;border-color:#bee3f8;border-color:rgba(190, 227, 248, var(--divide-opacity))
  }.md\\:divide-blue-300>:not(template)~:not(template){--divide-opacity:1;border-color:#90cdf4;border-color:rgba(144, 205, 244, var(--divide-opacity))
  }.md\\:divide-blue-400>:not(template)~:not(template){--divide-opacity:1;border-color:#63b3ed;border-color:rgba(99, 179, 237, var(--divide-opacity))
  }.md\\:divide-blue-500>:not(template)~:not(template){--divide-opacity:1;border-color:#4299e1;border-color:rgba(66, 153, 225, var(--divide-opacity))
  }.md\\:divide-blue-600>:not(template)~:not(template){--divide-opacity:1;border-color:#3182ce;border-color:rgba(49, 130, 206, var(--divide-opacity))
  }.md\\:divide-blue-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2b6cb0;border-color:rgba(43, 108, 176, var(--divide-opacity))
  }.md\\:divide-blue-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2c5282;border-color:rgba(44, 82, 130, var(--divide-opacity))
  }.md\\:divide-blue-900>:not(template)~:not(template){--divide-opacity:1;border-color:#2a4365;border-color:rgba(42, 67, 101, var(--divide-opacity))
  }.md\\:divide-indigo-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf4ff;border-color:rgba(235, 244, 255, var(--divide-opacity))
  }.md\\:divide-indigo-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c3dafe;border-color:rgba(195, 218, 254, var(--divide-opacity))
  }.md\\:divide-indigo-300>:not(template)~:not(template){--divide-opacity:1;border-color:#a3bffa;border-color:rgba(163, 191, 250, var(--divide-opacity))
  }.md\\:divide-indigo-400>:not(template)~:not(template){--divide-opacity:1;border-color:#7f9cf5;border-color:rgba(127, 156, 245, var(--divide-opacity))
  }.md\\:divide-indigo-500>:not(template)~:not(template){--divide-opacity:1;border-color:#667eea;border-color:rgba(102, 126, 234, var(--divide-opacity))
  }.md\\:divide-indigo-600>:not(template)~:not(template){--divide-opacity:1;border-color:#5a67d8;border-color:rgba(90, 103, 216, var(--divide-opacity))
  }.md\\:divide-indigo-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4c51bf;border-color:rgba(76, 81, 191, var(--divide-opacity))
  }.md\\:divide-indigo-800>:not(template)~:not(template){--divide-opacity:1;border-color:#434190;border-color:rgba(67, 65, 144, var(--divide-opacity))
  }.md\\:divide-indigo-900>:not(template)~:not(template){--divide-opacity:1;border-color:#3c366b;border-color:rgba(60, 54, 107, var(--divide-opacity))
  }.md\\:divide-purple-100>:not(template)~:not(template){--divide-opacity:1;border-color:#faf5ff;border-color:rgba(250, 245, 255, var(--divide-opacity))
  }.md\\:divide-purple-200>:not(template)~:not(template){--divide-opacity:1;border-color:#e9d8fd;border-color:rgba(233, 216, 253, var(--divide-opacity))
  }.md\\:divide-purple-300>:not(template)~:not(template){--divide-opacity:1;border-color:#d6bcfa;border-color:rgba(214, 188, 250, var(--divide-opacity))
  }.md\\:divide-purple-400>:not(template)~:not(template){--divide-opacity:1;border-color:#b794f4;border-color:rgba(183, 148, 244, var(--divide-opacity))
  }.md\\:divide-purple-500>:not(template)~:not(template){--divide-opacity:1;border-color:#9f7aea;border-color:rgba(159, 122, 234, var(--divide-opacity))
  }.md\\:divide-purple-600>:not(template)~:not(template){--divide-opacity:1;border-color:#805ad5;border-color:rgba(128, 90, 213, var(--divide-opacity))
  }.md\\:divide-purple-700>:not(template)~:not(template){--divide-opacity:1;border-color:#6b46c1;border-color:rgba(107, 70, 193, var(--divide-opacity))
  }.md\\:divide-purple-800>:not(template)~:not(template){--divide-opacity:1;border-color:#553c9a;border-color:rgba(85, 60, 154, var(--divide-opacity))
  }.md\\:divide-purple-900>:not(template)~:not(template){--divide-opacity:1;border-color:#44337a;border-color:rgba(68, 51, 122, var(--divide-opacity))
  }.md\\:divide-pink-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f7;border-color:rgba(255, 245, 247, var(--divide-opacity))
  }.md\\:divide-pink-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7e2;border-color:rgba(254, 215, 226, var(--divide-opacity))
  }.md\\:divide-pink-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbb6ce;border-color:rgba(251, 182, 206, var(--divide-opacity))
  }.md\\:divide-pink-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f687b3;border-color:rgba(246, 135, 179, var(--divide-opacity))
  }.md\\:divide-pink-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed64a6;border-color:rgba(237, 100, 166, var(--divide-opacity))
  }.md\\:divide-pink-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d53f8c;border-color:rgba(213, 63, 140, var(--divide-opacity))
  }.md\\:divide-pink-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b83280;border-color:rgba(184, 50, 128, var(--divide-opacity))
  }.md\\:divide-pink-800>:not(template)~:not(template){--divide-opacity:1;border-color:#97266d;border-color:rgba(151, 38, 109, var(--divide-opacity))
  }.md\\:divide-pink-900>:not(template)~:not(template){--divide-opacity:1;border-color:#702459;border-color:rgba(112, 36, 89, var(--divide-opacity))
  }.md\\:divide-primary>:not(template)~:not(template){--divide-opacity:1;border-color:#233D81;border-color:rgba(35, 61, 129, var(--divide-opacity))
  }.md\\:divide-secondary>:not(template)~:not(template){--divide-opacity:1;border-color:#1C8FC0;border-color:rgba(28, 143, 192, var(--divide-opacity))
  }.md\\:divide-tertiary>:not(template)~:not(template){--divide-opacity:1;border-color:#2AD78B;border-color:rgba(42, 215, 139, var(--divide-opacity))
  }.md\\:divide-dark>:not(template)~:not(template){--divide-opacity:1;border-color:#03174B;border-color:rgba(3, 23, 75, var(--divide-opacity))
  }.md\\:divide-smoke-darkest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.9)
  }.md\\:divide-smoke-darker>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.75)
  }.md\\:divide-smoke-dark>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.6)
  }.md\\:divide-smoke>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.5)
  }.md\\:divide-smoke-light>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.4)
  }.md\\:divide-smoke-lighter>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.25)
  }.md\\:divide-smoke-lightest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.1)
  }.md\\:divide-opacity-0>:not(template)~:not(template){--divide-opacity:0
  }.md\\:divide-opacity-25>:not(template)~:not(template){--divide-opacity:0.25
  }.md\\:divide-opacity-50>:not(template)~:not(template){--divide-opacity:0.5
  }.md\\:divide-opacity-75>:not(template)~:not(template){--divide-opacity:0.75
  }.md\\:divide-opacity-100>:not(template)~:not(template){--divide-opacity:1
  }.md\\:flex-shrink-0{flex-shrink:0
  }}@media(min-width: 1024px){.lg\\:space-y-0>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0px * var(--space-y-reverse))
  }.lg\\:space-x-0>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0px * var(--space-x-reverse));margin-left:calc(0px * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.25rem * var(--space-y-reverse))
  }.lg\\:space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.25rem * var(--space-x-reverse));margin-left:calc(0.25rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.5rem * var(--space-y-reverse))
  }.lg\\:space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.5rem * var(--space-x-reverse));margin-left:calc(0.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.75rem * var(--space-y-reverse))
  }.lg\\:space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.75rem * var(--space-x-reverse));margin-left:calc(0.75rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem * var(--space-y-reverse))
  }.lg\\:space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1rem * var(--space-x-reverse));margin-left:calc(1rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.25rem * var(--space-y-reverse))
  }.lg\\:space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.25rem * var(--space-x-reverse));margin-left:calc(1.25rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem * var(--space-y-reverse))
  }.lg\\:space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.5rem * var(--space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2rem * var(--space-y-reverse))
  }.lg\\:space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2rem * var(--space-x-reverse));margin-left:calc(2rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2.5rem * var(--space-y-reverse))
  }.lg\\:space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2.5rem * var(--space-x-reverse));margin-left:calc(2.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(3rem * var(--space-y-reverse))
  }.lg\\:space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(3rem * var(--space-x-reverse));margin-left:calc(3rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(4rem * var(--space-y-reverse))
  }.lg\\:space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(4rem * var(--space-x-reverse));margin-left:calc(4rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(5rem * var(--space-y-reverse))
  }.lg\\:space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(5rem * var(--space-x-reverse));margin-left:calc(5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(6rem * var(--space-y-reverse))
  }.lg\\:space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(6rem * var(--space-x-reverse));margin-left:calc(6rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(8rem * var(--space-y-reverse))
  }.lg\\:space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(8rem * var(--space-x-reverse));margin-left:calc(8rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(10rem * var(--space-y-reverse))
  }.lg\\:space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(10rem * var(--space-x-reverse));margin-left:calc(10rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(12rem * var(--space-y-reverse))
  }.lg\\:space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(12rem * var(--space-x-reverse));margin-left:calc(12rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(14rem * var(--space-y-reverse))
  }.lg\\:space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(14rem * var(--space-x-reverse));margin-left:calc(14rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(16rem * var(--space-y-reverse))
  }.lg\\:space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(16rem * var(--space-x-reverse));margin-left:calc(16rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1px * var(--space-y-reverse))
  }.lg\\:space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1px * var(--space-x-reverse));margin-left:calc(1px * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.25rem * var(--space-y-reverse))
  }.lg\\:-space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.25rem * var(--space-x-reverse));margin-left:calc(-0.25rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.5rem * var(--space-y-reverse))
  }.lg\\:-space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.5rem * var(--space-x-reverse));margin-left:calc(-0.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.75rem * var(--space-y-reverse))
  }.lg\\:-space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.75rem * var(--space-x-reverse));margin-left:calc(-0.75rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1rem * var(--space-y-reverse))
  }.lg\\:-space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1rem * var(--space-x-reverse));margin-left:calc(-1rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.25rem * var(--space-y-reverse))
  }.lg\\:-space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.25rem * var(--space-x-reverse));margin-left:calc(-1.25rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.5rem * var(--space-y-reverse))
  }.lg\\:-space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.5rem * var(--space-x-reverse));margin-left:calc(-1.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2rem * var(--space-y-reverse))
  }.lg\\:-space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2rem * var(--space-x-reverse));margin-left:calc(-2rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2.5rem * var(--space-y-reverse))
  }.lg\\:-space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2.5rem * var(--space-x-reverse));margin-left:calc(-2.5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-3rem * var(--space-y-reverse))
  }.lg\\:-space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-3rem * var(--space-x-reverse));margin-left:calc(-3rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-4rem * var(--space-y-reverse))
  }.lg\\:-space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-4rem * var(--space-x-reverse));margin-left:calc(-4rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-5rem * var(--space-y-reverse))
  }.lg\\:-space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-5rem * var(--space-x-reverse));margin-left:calc(-5rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-6rem * var(--space-y-reverse))
  }.lg\\:-space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-6rem * var(--space-x-reverse));margin-left:calc(-6rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-8rem * var(--space-y-reverse))
  }.lg\\:-space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-8rem * var(--space-x-reverse));margin-left:calc(-8rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-10rem * var(--space-y-reverse))
  }.lg\\:-space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-10rem * var(--space-x-reverse));margin-left:calc(-10rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-12rem * var(--space-y-reverse))
  }.lg\\:-space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-12rem * var(--space-x-reverse));margin-left:calc(-12rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-14rem * var(--space-y-reverse))
  }.lg\\:-space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-14rem * var(--space-x-reverse));margin-left:calc(-14rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-16rem * var(--space-y-reverse))
  }.lg\\:-space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-16rem * var(--space-x-reverse));margin-left:calc(-16rem * calc(1 - var(--space-x-reverse)))
  }.lg\\:-space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1px * var(--space-y-reverse))
  }.lg\\:-space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1px * var(--space-x-reverse));margin-left:calc(-1px * calc(1 - var(--space-x-reverse)))
  }.lg\\:space-y-reverse>:not(template)~:not(template){--space-y-reverse:1
  }.lg\\:space-x-reverse>:not(template)~:not(template){--space-x-reverse:1
  }.lg\\:divide-y-0>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(0px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(0px * var(--divide-y-reverse))
  }.lg\\:divide-x-0>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(0px * var(--divide-x-reverse));border-left-width:calc(0px * calc(1 - var(--divide-x-reverse)))
  }.lg\\:divide-y-2>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(2px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(2px * var(--divide-y-reverse))
  }.lg\\:divide-x-2>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(2px * var(--divide-x-reverse));border-left-width:calc(2px * calc(1 - var(--divide-x-reverse)))
  }.lg\\:divide-y-4>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(4px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(4px * var(--divide-y-reverse))
  }.lg\\:divide-x-4>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(4px * var(--divide-x-reverse));border-left-width:calc(4px * calc(1 - var(--divide-x-reverse)))
  }.lg\\:divide-y-8>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(8px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(8px * var(--divide-y-reverse))
  }.lg\\:divide-x-8>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(8px * var(--divide-x-reverse));border-left-width:calc(8px * calc(1 - var(--divide-x-reverse)))
  }.lg\\:divide-y>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(1px * var(--divide-y-reverse))
  }.lg\\:divide-x>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(1px * var(--divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--divide-x-reverse)))
  }.lg\\:divide-y-reverse>:not(template)~:not(template){--divide-y-reverse:1
  }.lg\\:divide-x-reverse>:not(template)~:not(template){--divide-x-reverse:1
  }.lg\\:divide-transparent>:not(template)~:not(template){border-color:transparent
  }.lg\\:divide-current>:not(template)~:not(template){border-color:currentColor
  }.lg\\:divide-black>:not(template)~:not(template){--divide-opacity:1;border-color:#000;border-color:rgba(0, 0, 0, var(--divide-opacity))
  }.lg\\:divide-white>:not(template)~:not(template){--divide-opacity:1;border-color:#fff;border-color:rgba(255, 255, 255, var(--divide-opacity))
  }.lg\\:divide-gray-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f7fafc;border-color:rgba(247, 250, 252, var(--divide-opacity))
  }.lg\\:divide-gray-200>:not(template)~:not(template){--divide-opacity:1;border-color:#edf2f7;border-color:rgba(237, 242, 247, var(--divide-opacity))
  }.lg\\:divide-gray-300>:not(template)~:not(template){--divide-opacity:1;border-color:#e2e8f0;border-color:rgba(226, 232, 240, var(--divide-opacity))
  }.lg\\:divide-gray-400>:not(template)~:not(template){--divide-opacity:1;border-color:#cbd5e0;border-color:rgba(203, 213, 224, var(--divide-opacity))
  }.lg\\:divide-gray-500>:not(template)~:not(template){--divide-opacity:1;border-color:#a0aec0;border-color:rgba(160, 174, 192, var(--divide-opacity))
  }.lg\\:divide-gray-600>:not(template)~:not(template){--divide-opacity:1;border-color:#718096;border-color:rgba(113, 128, 150, var(--divide-opacity))
  }.lg\\:divide-gray-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4a5568;border-color:rgba(74, 85, 104, var(--divide-opacity))
  }.lg\\:divide-gray-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2d3748;border-color:rgba(45, 55, 72, var(--divide-opacity))
  }.lg\\:divide-gray-900>:not(template)~:not(template){--divide-opacity:1;border-color:#1a202c;border-color:rgba(26, 32, 44, var(--divide-opacity))
  }.lg\\:divide-red-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f5;border-color:rgba(255, 245, 245, var(--divide-opacity))
  }.lg\\:divide-red-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7d7;border-color:rgba(254, 215, 215, var(--divide-opacity))
  }.lg\\:divide-red-300>:not(template)~:not(template){--divide-opacity:1;border-color:#feb2b2;border-color:rgba(254, 178, 178, var(--divide-opacity))
  }.lg\\:divide-red-400>:not(template)~:not(template){--divide-opacity:1;border-color:#fc8181;border-color:rgba(252, 129, 129, var(--divide-opacity))
  }.lg\\:divide-red-500>:not(template)~:not(template){--divide-opacity:1;border-color:#f56565;border-color:rgba(245, 101, 101, var(--divide-opacity))
  }.lg\\:divide-red-600>:not(template)~:not(template){--divide-opacity:1;border-color:#e53e3e;border-color:rgba(229, 62, 62, var(--divide-opacity))
  }.lg\\:divide-red-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c53030;border-color:rgba(197, 48, 48, var(--divide-opacity))
  }.lg\\:divide-red-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9b2c2c;border-color:rgba(155, 44, 44, var(--divide-opacity))
  }.lg\\:divide-red-900>:not(template)~:not(template){--divide-opacity:1;border-color:#742a2a;border-color:rgba(116, 42, 42, var(--divide-opacity))
  }.lg\\:divide-orange-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffaf0;border-color:rgba(255, 250, 240, var(--divide-opacity))
  }.lg\\:divide-orange-200>:not(template)~:not(template){--divide-opacity:1;border-color:#feebc8;border-color:rgba(254, 235, 200, var(--divide-opacity))
  }.lg\\:divide-orange-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbd38d;border-color:rgba(251, 211, 141, var(--divide-opacity))
  }.lg\\:divide-orange-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6ad55;border-color:rgba(246, 173, 85, var(--divide-opacity))
  }.lg\\:divide-orange-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed8936;border-color:rgba(237, 137, 54, var(--divide-opacity))
  }.lg\\:divide-orange-600>:not(template)~:not(template){--divide-opacity:1;border-color:#dd6b20;border-color:rgba(221, 107, 32, var(--divide-opacity))
  }.lg\\:divide-orange-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c05621;border-color:rgba(192, 86, 33, var(--divide-opacity))
  }.lg\\:divide-orange-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9c4221;border-color:rgba(156, 66, 33, var(--divide-opacity))
  }.lg\\:divide-orange-900>:not(template)~:not(template){--divide-opacity:1;border-color:#7b341e;border-color:rgba(123, 52, 30, var(--divide-opacity))
  }.lg\\:divide-yellow-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffff0;border-color:rgba(255, 255, 240, var(--divide-opacity))
  }.lg\\:divide-yellow-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fefcbf;border-color:rgba(254, 252, 191, var(--divide-opacity))
  }.lg\\:divide-yellow-300>:not(template)~:not(template){--divide-opacity:1;border-color:#faf089;border-color:rgba(250, 240, 137, var(--divide-opacity))
  }.lg\\:divide-yellow-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6e05e;border-color:rgba(246, 224, 94, var(--divide-opacity))
  }.lg\\:divide-yellow-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ecc94b;border-color:rgba(236, 201, 75, var(--divide-opacity))
  }.lg\\:divide-yellow-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d69e2e;border-color:rgba(214, 158, 46, var(--divide-opacity))
  }.lg\\:divide-yellow-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b7791f;border-color:rgba(183, 121, 31, var(--divide-opacity))
  }.lg\\:divide-yellow-800>:not(template)~:not(template){--divide-opacity:1;border-color:#975a16;border-color:rgba(151, 90, 22, var(--divide-opacity))
  }.lg\\:divide-yellow-900>:not(template)~:not(template){--divide-opacity:1;border-color:#744210;border-color:rgba(116, 66, 16, var(--divide-opacity))
  }.lg\\:divide-green-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f0fff4;border-color:rgba(240, 255, 244, var(--divide-opacity))
  }.lg\\:divide-green-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c6f6d5;border-color:rgba(198, 246, 213, var(--divide-opacity))
  }.lg\\:divide-green-300>:not(template)~:not(template){--divide-opacity:1;border-color:#9ae6b4;border-color:rgba(154, 230, 180, var(--divide-opacity))
  }.lg\\:divide-green-400>:not(template)~:not(template){--divide-opacity:1;border-color:#68d391;border-color:rgba(104, 211, 145, var(--divide-opacity))
  }.lg\\:divide-green-500>:not(template)~:not(template){--divide-opacity:1;border-color:#48bb78;border-color:rgba(72, 187, 120, var(--divide-opacity))
  }.lg\\:divide-green-600>:not(template)~:not(template){--divide-opacity:1;border-color:#38a169;border-color:rgba(56, 161, 105, var(--divide-opacity))
  }.lg\\:divide-green-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2f855a;border-color:rgba(47, 133, 90, var(--divide-opacity))
  }.lg\\:divide-green-800>:not(template)~:not(template){--divide-opacity:1;border-color:#276749;border-color:rgba(39, 103, 73, var(--divide-opacity))
  }.lg\\:divide-green-900>:not(template)~:not(template){--divide-opacity:1;border-color:#22543d;border-color:rgba(34, 84, 61, var(--divide-opacity))
  }.lg\\:divide-teal-100>:not(template)~:not(template){--divide-opacity:1;border-color:#e6fffa;border-color:rgba(230, 255, 250, var(--divide-opacity))
  }.lg\\:divide-teal-200>:not(template)~:not(template){--divide-opacity:1;border-color:#b2f5ea;border-color:rgba(178, 245, 234, var(--divide-opacity))
  }.lg\\:divide-teal-300>:not(template)~:not(template){--divide-opacity:1;border-color:#81e6d9;border-color:rgba(129, 230, 217, var(--divide-opacity))
  }.lg\\:divide-teal-400>:not(template)~:not(template){--divide-opacity:1;border-color:#4fd1c5;border-color:rgba(79, 209, 197, var(--divide-opacity))
  }.lg\\:divide-teal-500>:not(template)~:not(template){--divide-opacity:1;border-color:#38b2ac;border-color:rgba(56, 178, 172, var(--divide-opacity))
  }.lg\\:divide-teal-600>:not(template)~:not(template){--divide-opacity:1;border-color:#319795;border-color:rgba(49, 151, 149, var(--divide-opacity))
  }.lg\\:divide-teal-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2c7a7b;border-color:rgba(44, 122, 123, var(--divide-opacity))
  }.lg\\:divide-teal-800>:not(template)~:not(template){--divide-opacity:1;border-color:#285e61;border-color:rgba(40, 94, 97, var(--divide-opacity))
  }.lg\\:divide-teal-900>:not(template)~:not(template){--divide-opacity:1;border-color:#234e52;border-color:rgba(35, 78, 82, var(--divide-opacity))
  }.lg\\:divide-blue-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf8ff;border-color:rgba(235, 248, 255, var(--divide-opacity))
  }.lg\\:divide-blue-200>:not(template)~:not(template){--divide-opacity:1;border-color:#bee3f8;border-color:rgba(190, 227, 248, var(--divide-opacity))
  }.lg\\:divide-blue-300>:not(template)~:not(template){--divide-opacity:1;border-color:#90cdf4;border-color:rgba(144, 205, 244, var(--divide-opacity))
  }.lg\\:divide-blue-400>:not(template)~:not(template){--divide-opacity:1;border-color:#63b3ed;border-color:rgba(99, 179, 237, var(--divide-opacity))
  }.lg\\:divide-blue-500>:not(template)~:not(template){--divide-opacity:1;border-color:#4299e1;border-color:rgba(66, 153, 225, var(--divide-opacity))
  }.lg\\:divide-blue-600>:not(template)~:not(template){--divide-opacity:1;border-color:#3182ce;border-color:rgba(49, 130, 206, var(--divide-opacity))
  }.lg\\:divide-blue-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2b6cb0;border-color:rgba(43, 108, 176, var(--divide-opacity))
  }.lg\\:divide-blue-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2c5282;border-color:rgba(44, 82, 130, var(--divide-opacity))
  }.lg\\:divide-blue-900>:not(template)~:not(template){--divide-opacity:1;border-color:#2a4365;border-color:rgba(42, 67, 101, var(--divide-opacity))
  }.lg\\:divide-indigo-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf4ff;border-color:rgba(235, 244, 255, var(--divide-opacity))
  }.lg\\:divide-indigo-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c3dafe;border-color:rgba(195, 218, 254, var(--divide-opacity))
  }.lg\\:divide-indigo-300>:not(template)~:not(template){--divide-opacity:1;border-color:#a3bffa;border-color:rgba(163, 191, 250, var(--divide-opacity))
  }.lg\\:divide-indigo-400>:not(template)~:not(template){--divide-opacity:1;border-color:#7f9cf5;border-color:rgba(127, 156, 245, var(--divide-opacity))
  }.lg\\:divide-indigo-500>:not(template)~:not(template){--divide-opacity:1;border-color:#667eea;border-color:rgba(102, 126, 234, var(--divide-opacity))
  }.lg\\:divide-indigo-600>:not(template)~:not(template){--divide-opacity:1;border-color:#5a67d8;border-color:rgba(90, 103, 216, var(--divide-opacity))
  }.lg\\:divide-indigo-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4c51bf;border-color:rgba(76, 81, 191, var(--divide-opacity))
  }.lg\\:divide-indigo-800>:not(template)~:not(template){--divide-opacity:1;border-color:#434190;border-color:rgba(67, 65, 144, var(--divide-opacity))
  }.lg\\:divide-indigo-900>:not(template)~:not(template){--divide-opacity:1;border-color:#3c366b;border-color:rgba(60, 54, 107, var(--divide-opacity))
  }.lg\\:divide-purple-100>:not(template)~:not(template){--divide-opacity:1;border-color:#faf5ff;border-color:rgba(250, 245, 255, var(--divide-opacity))
  }.lg\\:divide-purple-200>:not(template)~:not(template){--divide-opacity:1;border-color:#e9d8fd;border-color:rgba(233, 216, 253, var(--divide-opacity))
  }.lg\\:divide-purple-300>:not(template)~:not(template){--divide-opacity:1;border-color:#d6bcfa;border-color:rgba(214, 188, 250, var(--divide-opacity))
  }.lg\\:divide-purple-400>:not(template)~:not(template){--divide-opacity:1;border-color:#b794f4;border-color:rgba(183, 148, 244, var(--divide-opacity))
  }.lg\\:divide-purple-500>:not(template)~:not(template){--divide-opacity:1;border-color:#9f7aea;border-color:rgba(159, 122, 234, var(--divide-opacity))
  }.lg\\:divide-purple-600>:not(template)~:not(template){--divide-opacity:1;border-color:#805ad5;border-color:rgba(128, 90, 213, var(--divide-opacity))
  }.lg\\:divide-purple-700>:not(template)~:not(template){--divide-opacity:1;border-color:#6b46c1;border-color:rgba(107, 70, 193, var(--divide-opacity))
  }.lg\\:divide-purple-800>:not(template)~:not(template){--divide-opacity:1;border-color:#553c9a;border-color:rgba(85, 60, 154, var(--divide-opacity))
  }.lg\\:divide-purple-900>:not(template)~:not(template){--divide-opacity:1;border-color:#44337a;border-color:rgba(68, 51, 122, var(--divide-opacity))
  }.lg\\:divide-pink-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f7;border-color:rgba(255, 245, 247, var(--divide-opacity))
  }.lg\\:divide-pink-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7e2;border-color:rgba(254, 215, 226, var(--divide-opacity))
  }.lg\\:divide-pink-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbb6ce;border-color:rgba(251, 182, 206, var(--divide-opacity))
  }.lg\\:divide-pink-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f687b3;border-color:rgba(246, 135, 179, var(--divide-opacity))
  }.lg\\:divide-pink-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed64a6;border-color:rgba(237, 100, 166, var(--divide-opacity))
  }.lg\\:divide-pink-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d53f8c;border-color:rgba(213, 63, 140, var(--divide-opacity))
  }.lg\\:divide-pink-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b83280;border-color:rgba(184, 50, 128, var(--divide-opacity))
  }.lg\\:divide-pink-800>:not(template)~:not(template){--divide-opacity:1;border-color:#97266d;border-color:rgba(151, 38, 109, var(--divide-opacity))
  }.lg\\:divide-pink-900>:not(template)~:not(template){--divide-opacity:1;border-color:#702459;border-color:rgba(112, 36, 89, var(--divide-opacity))
  }.lg\\:divide-primary>:not(template)~:not(template){--divide-opacity:1;border-color:#233D81;border-color:rgba(35, 61, 129, var(--divide-opacity))
  }.lg\\:divide-secondary>:not(template)~:not(template){--divide-opacity:1;border-color:#1C8FC0;border-color:rgba(28, 143, 192, var(--divide-opacity))
  }.lg\\:divide-tertiary>:not(template)~:not(template){--divide-opacity:1;border-color:#2AD78B;border-color:rgba(42, 215, 139, var(--divide-opacity))
  }.lg\\:divide-dark>:not(template)~:not(template){--divide-opacity:1;border-color:#03174B;border-color:rgba(3, 23, 75, var(--divide-opacity))
  }.lg\\:divide-smoke-darkest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.9)
  }.lg\\:divide-smoke-darker>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.75)
  }.lg\\:divide-smoke-dark>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.6)
  }.lg\\:divide-smoke>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.5)
  }.lg\\:divide-smoke-light>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.4)
  }.lg\\:divide-smoke-lighter>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.25)
  }.lg\\:divide-smoke-lightest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.1)
  }.lg\\:divide-opacity-0>:not(template)~:not(template){--divide-opacity:0
  }.lg\\:divide-opacity-25>:not(template)~:not(template){--divide-opacity:0.25
  }.lg\\:divide-opacity-50>:not(template)~:not(template){--divide-opacity:0.5
  }.lg\\:divide-opacity-75>:not(template)~:not(template){--divide-opacity:0.75
  }.lg\\:divide-opacity-100>:not(template)~:not(template){--divide-opacity:1
  }}@media(min-width: 1280px){.xl\\:space-y-0>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0px * var(--space-y-reverse))
  }.xl\\:space-x-0>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0px * var(--space-x-reverse));margin-left:calc(0px * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.25rem * var(--space-y-reverse))
  }.xl\\:space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.25rem * var(--space-x-reverse));margin-left:calc(0.25rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.5rem * var(--space-y-reverse))
  }.xl\\:space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.5rem * var(--space-x-reverse));margin-left:calc(0.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(0.75rem * var(--space-y-reverse))
  }.xl\\:space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(0.75rem * var(--space-x-reverse));margin-left:calc(0.75rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1rem * var(--space-y-reverse))
  }.xl\\:space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1rem * var(--space-x-reverse));margin-left:calc(1rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.25rem * var(--space-y-reverse))
  }.xl\\:space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.25rem * var(--space-x-reverse));margin-left:calc(1.25rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1.5rem * var(--space-y-reverse))
  }.xl\\:space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1.5rem * var(--space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2rem * var(--space-y-reverse))
  }.xl\\:space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2rem * var(--space-x-reverse));margin-left:calc(2rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(2.5rem * var(--space-y-reverse))
  }.xl\\:space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(2.5rem * var(--space-x-reverse));margin-left:calc(2.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(3rem * var(--space-y-reverse))
  }.xl\\:space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(3rem * var(--space-x-reverse));margin-left:calc(3rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(4rem * var(--space-y-reverse))
  }.xl\\:space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(4rem * var(--space-x-reverse));margin-left:calc(4rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(5rem * var(--space-y-reverse))
  }.xl\\:space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(5rem * var(--space-x-reverse));margin-left:calc(5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(6rem * var(--space-y-reverse))
  }.xl\\:space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(6rem * var(--space-x-reverse));margin-left:calc(6rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(8rem * var(--space-y-reverse))
  }.xl\\:space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(8rem * var(--space-x-reverse));margin-left:calc(8rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(10rem * var(--space-y-reverse))
  }.xl\\:space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(10rem * var(--space-x-reverse));margin-left:calc(10rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(12rem * var(--space-y-reverse))
  }.xl\\:space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(12rem * var(--space-x-reverse));margin-left:calc(12rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(14rem * var(--space-y-reverse))
  }.xl\\:space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(14rem * var(--space-x-reverse));margin-left:calc(14rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(16rem * var(--space-y-reverse))
  }.xl\\:space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(16rem * var(--space-x-reverse));margin-left:calc(16rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(1px * var(--space-y-reverse))
  }.xl\\:space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(1px * var(--space-x-reverse));margin-left:calc(1px * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-1>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.25rem * var(--space-y-reverse))
  }.xl\\:-space-x-1>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.25rem * var(--space-x-reverse));margin-left:calc(-0.25rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-2>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.5rem * var(--space-y-reverse))
  }.xl\\:-space-x-2>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.5rem * var(--space-x-reverse));margin-left:calc(-0.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-3>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-0.75rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-0.75rem * var(--space-y-reverse))
  }.xl\\:-space-x-3>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-0.75rem * var(--space-x-reverse));margin-left:calc(-0.75rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-4>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1rem * var(--space-y-reverse))
  }.xl\\:-space-x-4>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1rem * var(--space-x-reverse));margin-left:calc(-1rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-5>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.25rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.25rem * var(--space-y-reverse))
  }.xl\\:-space-x-5>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.25rem * var(--space-x-reverse));margin-left:calc(-1.25rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-6>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1.5rem * var(--space-y-reverse))
  }.xl\\:-space-x-6>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1.5rem * var(--space-x-reverse));margin-left:calc(-1.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-8>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2rem * var(--space-y-reverse))
  }.xl\\:-space-x-8>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2rem * var(--space-x-reverse));margin-left:calc(-2rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-10>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-2.5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-2.5rem * var(--space-y-reverse))
  }.xl\\:-space-x-10>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-2.5rem * var(--space-x-reverse));margin-left:calc(-2.5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-12>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-3rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-3rem * var(--space-y-reverse))
  }.xl\\:-space-x-12>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-3rem * var(--space-x-reverse));margin-left:calc(-3rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-16>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-4rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-4rem * var(--space-y-reverse))
  }.xl\\:-space-x-16>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-4rem * var(--space-x-reverse));margin-left:calc(-4rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-20>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-5rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-5rem * var(--space-y-reverse))
  }.xl\\:-space-x-20>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-5rem * var(--space-x-reverse));margin-left:calc(-5rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-24>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-6rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-6rem * var(--space-y-reverse))
  }.xl\\:-space-x-24>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-6rem * var(--space-x-reverse));margin-left:calc(-6rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-32>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-8rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-8rem * var(--space-y-reverse))
  }.xl\\:-space-x-32>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-8rem * var(--space-x-reverse));margin-left:calc(-8rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-40>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-10rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-10rem * var(--space-y-reverse))
  }.xl\\:-space-x-40>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-10rem * var(--space-x-reverse));margin-left:calc(-10rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-48>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-12rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-12rem * var(--space-y-reverse))
  }.xl\\:-space-x-48>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-12rem * var(--space-x-reverse));margin-left:calc(-12rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-56>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-14rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-14rem * var(--space-y-reverse))
  }.xl\\:-space-x-56>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-14rem * var(--space-x-reverse));margin-left:calc(-14rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-64>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-16rem * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-16rem * var(--space-y-reverse))
  }.xl\\:-space-x-64>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-16rem * var(--space-x-reverse));margin-left:calc(-16rem * calc(1 - var(--space-x-reverse)))
  }.xl\\:-space-y-px>:not(template)~:not(template){--space-y-reverse:0;margin-top:calc(-1px * calc(1 - var(--space-y-reverse)));margin-bottom:calc(-1px * var(--space-y-reverse))
  }.xl\\:-space-x-px>:not(template)~:not(template){--space-x-reverse:0;margin-right:calc(-1px * var(--space-x-reverse));margin-left:calc(-1px * calc(1 - var(--space-x-reverse)))
  }.xl\\:space-y-reverse>:not(template)~:not(template){--space-y-reverse:1
  }.xl\\:space-x-reverse>:not(template)~:not(template){--space-x-reverse:1
  }.xl\\:divide-y-0>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(0px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(0px * var(--divide-y-reverse))
  }.xl\\:divide-x-0>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(0px * var(--divide-x-reverse));border-left-width:calc(0px * calc(1 - var(--divide-x-reverse)))
  }.xl\\:divide-y-2>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(2px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(2px * var(--divide-y-reverse))
  }.xl\\:divide-x-2>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(2px * var(--divide-x-reverse));border-left-width:calc(2px * calc(1 - var(--divide-x-reverse)))
  }.xl\\:divide-y-4>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(4px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(4px * var(--divide-y-reverse))
  }.xl\\:divide-x-4>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(4px * var(--divide-x-reverse));border-left-width:calc(4px * calc(1 - var(--divide-x-reverse)))
  }.xl\\:divide-y-8>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(8px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(8px * var(--divide-y-reverse))
  }.xl\\:divide-x-8>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(8px * var(--divide-x-reverse));border-left-width:calc(8px * calc(1 - var(--divide-x-reverse)))
  }.xl\\:divide-y>:not(template)~:not(template){--divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--divide-y-reverse)));border-bottom-width:calc(1px * var(--divide-y-reverse))
  }.xl\\:divide-x>:not(template)~:not(template){--divide-x-reverse:0;border-right-width:calc(1px * var(--divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--divide-x-reverse)))
  }.xl\\:divide-y-reverse>:not(template)~:not(template){--divide-y-reverse:1
  }.xl\\:divide-x-reverse>:not(template)~:not(template){--divide-x-reverse:1
  }.xl\\:divide-transparent>:not(template)~:not(template){border-color:transparent
  }.xl\\:divide-current>:not(template)~:not(template){border-color:currentColor
  }.xl\\:divide-black>:not(template)~:not(template){--divide-opacity:1;border-color:#000;border-color:rgba(0, 0, 0, var(--divide-opacity))
  }.xl\\:divide-white>:not(template)~:not(template){--divide-opacity:1;border-color:#fff;border-color:rgba(255, 255, 255, var(--divide-opacity))
  }.xl\\:divide-gray-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f7fafc;border-color:rgba(247, 250, 252, var(--divide-opacity))
  }.xl\\:divide-gray-200>:not(template)~:not(template){--divide-opacity:1;border-color:#edf2f7;border-color:rgba(237, 242, 247, var(--divide-opacity))
  }.xl\\:divide-gray-300>:not(template)~:not(template){--divide-opacity:1;border-color:#e2e8f0;border-color:rgba(226, 232, 240, var(--divide-opacity))
  }.xl\\:divide-gray-400>:not(template)~:not(template){--divide-opacity:1;border-color:#cbd5e0;border-color:rgba(203, 213, 224, var(--divide-opacity))
  }.xl\\:divide-gray-500>:not(template)~:not(template){--divide-opacity:1;border-color:#a0aec0;border-color:rgba(160, 174, 192, var(--divide-opacity))
  }.xl\\:divide-gray-600>:not(template)~:not(template){--divide-opacity:1;border-color:#718096;border-color:rgba(113, 128, 150, var(--divide-opacity))
  }.xl\\:divide-gray-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4a5568;border-color:rgba(74, 85, 104, var(--divide-opacity))
  }.xl\\:divide-gray-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2d3748;border-color:rgba(45, 55, 72, var(--divide-opacity))
  }.xl\\:divide-gray-900>:not(template)~:not(template){--divide-opacity:1;border-color:#1a202c;border-color:rgba(26, 32, 44, var(--divide-opacity))
  }.xl\\:divide-red-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f5;border-color:rgba(255, 245, 245, var(--divide-opacity))
  }.xl\\:divide-red-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7d7;border-color:rgba(254, 215, 215, var(--divide-opacity))
  }.xl\\:divide-red-300>:not(template)~:not(template){--divide-opacity:1;border-color:#feb2b2;border-color:rgba(254, 178, 178, var(--divide-opacity))
  }.xl\\:divide-red-400>:not(template)~:not(template){--divide-opacity:1;border-color:#fc8181;border-color:rgba(252, 129, 129, var(--divide-opacity))
  }.xl\\:divide-red-500>:not(template)~:not(template){--divide-opacity:1;border-color:#f56565;border-color:rgba(245, 101, 101, var(--divide-opacity))
  }.xl\\:divide-red-600>:not(template)~:not(template){--divide-opacity:1;border-color:#e53e3e;border-color:rgba(229, 62, 62, var(--divide-opacity))
  }.xl\\:divide-red-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c53030;border-color:rgba(197, 48, 48, var(--divide-opacity))
  }.xl\\:divide-red-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9b2c2c;border-color:rgba(155, 44, 44, var(--divide-opacity))
  }.xl\\:divide-red-900>:not(template)~:not(template){--divide-opacity:1;border-color:#742a2a;border-color:rgba(116, 42, 42, var(--divide-opacity))
  }.xl\\:divide-orange-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffaf0;border-color:rgba(255, 250, 240, var(--divide-opacity))
  }.xl\\:divide-orange-200>:not(template)~:not(template){--divide-opacity:1;border-color:#feebc8;border-color:rgba(254, 235, 200, var(--divide-opacity))
  }.xl\\:divide-orange-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbd38d;border-color:rgba(251, 211, 141, var(--divide-opacity))
  }.xl\\:divide-orange-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6ad55;border-color:rgba(246, 173, 85, var(--divide-opacity))
  }.xl\\:divide-orange-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed8936;border-color:rgba(237, 137, 54, var(--divide-opacity))
  }.xl\\:divide-orange-600>:not(template)~:not(template){--divide-opacity:1;border-color:#dd6b20;border-color:rgba(221, 107, 32, var(--divide-opacity))
  }.xl\\:divide-orange-700>:not(template)~:not(template){--divide-opacity:1;border-color:#c05621;border-color:rgba(192, 86, 33, var(--divide-opacity))
  }.xl\\:divide-orange-800>:not(template)~:not(template){--divide-opacity:1;border-color:#9c4221;border-color:rgba(156, 66, 33, var(--divide-opacity))
  }.xl\\:divide-orange-900>:not(template)~:not(template){--divide-opacity:1;border-color:#7b341e;border-color:rgba(123, 52, 30, var(--divide-opacity))
  }.xl\\:divide-yellow-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fffff0;border-color:rgba(255, 255, 240, var(--divide-opacity))
  }.xl\\:divide-yellow-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fefcbf;border-color:rgba(254, 252, 191, var(--divide-opacity))
  }.xl\\:divide-yellow-300>:not(template)~:not(template){--divide-opacity:1;border-color:#faf089;border-color:rgba(250, 240, 137, var(--divide-opacity))
  }.xl\\:divide-yellow-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f6e05e;border-color:rgba(246, 224, 94, var(--divide-opacity))
  }.xl\\:divide-yellow-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ecc94b;border-color:rgba(236, 201, 75, var(--divide-opacity))
  }.xl\\:divide-yellow-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d69e2e;border-color:rgba(214, 158, 46, var(--divide-opacity))
  }.xl\\:divide-yellow-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b7791f;border-color:rgba(183, 121, 31, var(--divide-opacity))
  }.xl\\:divide-yellow-800>:not(template)~:not(template){--divide-opacity:1;border-color:#975a16;border-color:rgba(151, 90, 22, var(--divide-opacity))
  }.xl\\:divide-yellow-900>:not(template)~:not(template){--divide-opacity:1;border-color:#744210;border-color:rgba(116, 66, 16, var(--divide-opacity))
  }.xl\\:divide-green-100>:not(template)~:not(template){--divide-opacity:1;border-color:#f0fff4;border-color:rgba(240, 255, 244, var(--divide-opacity))
  }.xl\\:divide-green-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c6f6d5;border-color:rgba(198, 246, 213, var(--divide-opacity))
  }.xl\\:divide-green-300>:not(template)~:not(template){--divide-opacity:1;border-color:#9ae6b4;border-color:rgba(154, 230, 180, var(--divide-opacity))
  }.xl\\:divide-green-400>:not(template)~:not(template){--divide-opacity:1;border-color:#68d391;border-color:rgba(104, 211, 145, var(--divide-opacity))
  }.xl\\:divide-green-500>:not(template)~:not(template){--divide-opacity:1;border-color:#48bb78;border-color:rgba(72, 187, 120, var(--divide-opacity))
  }.xl\\:divide-green-600>:not(template)~:not(template){--divide-opacity:1;border-color:#38a169;border-color:rgba(56, 161, 105, var(--divide-opacity))
  }.xl\\:divide-green-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2f855a;border-color:rgba(47, 133, 90, var(--divide-opacity))
  }.xl\\:divide-green-800>:not(template)~:not(template){--divide-opacity:1;border-color:#276749;border-color:rgba(39, 103, 73, var(--divide-opacity))
  }.xl\\:divide-green-900>:not(template)~:not(template){--divide-opacity:1;border-color:#22543d;border-color:rgba(34, 84, 61, var(--divide-opacity))
  }.xl\\:divide-teal-100>:not(template)~:not(template){--divide-opacity:1;border-color:#e6fffa;border-color:rgba(230, 255, 250, var(--divide-opacity))
  }.xl\\:divide-teal-200>:not(template)~:not(template){--divide-opacity:1;border-color:#b2f5ea;border-color:rgba(178, 245, 234, var(--divide-opacity))
  }.xl\\:divide-teal-300>:not(template)~:not(template){--divide-opacity:1;border-color:#81e6d9;border-color:rgba(129, 230, 217, var(--divide-opacity))
  }.xl\\:divide-teal-400>:not(template)~:not(template){--divide-opacity:1;border-color:#4fd1c5;border-color:rgba(79, 209, 197, var(--divide-opacity))
  }.xl\\:divide-teal-500>:not(template)~:not(template){--divide-opacity:1;border-color:#38b2ac;border-color:rgba(56, 178, 172, var(--divide-opacity))
  }.xl\\:divide-teal-600>:not(template)~:not(template){--divide-opacity:1;border-color:#319795;border-color:rgba(49, 151, 149, var(--divide-opacity))
  }.xl\\:divide-teal-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2c7a7b;border-color:rgba(44, 122, 123, var(--divide-opacity))
  }.xl\\:divide-teal-800>:not(template)~:not(template){--divide-opacity:1;border-color:#285e61;border-color:rgba(40, 94, 97, var(--divide-opacity))
  }.xl\\:divide-teal-900>:not(template)~:not(template){--divide-opacity:1;border-color:#234e52;border-color:rgba(35, 78, 82, var(--divide-opacity))
  }.xl\\:divide-blue-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf8ff;border-color:rgba(235, 248, 255, var(--divide-opacity))
  }.xl\\:divide-blue-200>:not(template)~:not(template){--divide-opacity:1;border-color:#bee3f8;border-color:rgba(190, 227, 248, var(--divide-opacity))
  }.xl\\:divide-blue-300>:not(template)~:not(template){--divide-opacity:1;border-color:#90cdf4;border-color:rgba(144, 205, 244, var(--divide-opacity))
  }.xl\\:divide-blue-400>:not(template)~:not(template){--divide-opacity:1;border-color:#63b3ed;border-color:rgba(99, 179, 237, var(--divide-opacity))
  }.xl\\:divide-blue-500>:not(template)~:not(template){--divide-opacity:1;border-color:#4299e1;border-color:rgba(66, 153, 225, var(--divide-opacity))
  }.xl\\:divide-blue-600>:not(template)~:not(template){--divide-opacity:1;border-color:#3182ce;border-color:rgba(49, 130, 206, var(--divide-opacity))
  }.xl\\:divide-blue-700>:not(template)~:not(template){--divide-opacity:1;border-color:#2b6cb0;border-color:rgba(43, 108, 176, var(--divide-opacity))
  }.xl\\:divide-blue-800>:not(template)~:not(template){--divide-opacity:1;border-color:#2c5282;border-color:rgba(44, 82, 130, var(--divide-opacity))
  }.xl\\:divide-blue-900>:not(template)~:not(template){--divide-opacity:1;border-color:#2a4365;border-color:rgba(42, 67, 101, var(--divide-opacity))
  }.xl\\:divide-indigo-100>:not(template)~:not(template){--divide-opacity:1;border-color:#ebf4ff;border-color:rgba(235, 244, 255, var(--divide-opacity))
  }.xl\\:divide-indigo-200>:not(template)~:not(template){--divide-opacity:1;border-color:#c3dafe;border-color:rgba(195, 218, 254, var(--divide-opacity))
  }.xl\\:divide-indigo-300>:not(template)~:not(template){--divide-opacity:1;border-color:#a3bffa;border-color:rgba(163, 191, 250, var(--divide-opacity))
  }.xl\\:divide-indigo-400>:not(template)~:not(template){--divide-opacity:1;border-color:#7f9cf5;border-color:rgba(127, 156, 245, var(--divide-opacity))
  }.xl\\:divide-indigo-500>:not(template)~:not(template){--divide-opacity:1;border-color:#667eea;border-color:rgba(102, 126, 234, var(--divide-opacity))
  }.xl\\:divide-indigo-600>:not(template)~:not(template){--divide-opacity:1;border-color:#5a67d8;border-color:rgba(90, 103, 216, var(--divide-opacity))
  }.xl\\:divide-indigo-700>:not(template)~:not(template){--divide-opacity:1;border-color:#4c51bf;border-color:rgba(76, 81, 191, var(--divide-opacity))
  }.xl\\:divide-indigo-800>:not(template)~:not(template){--divide-opacity:1;border-color:#434190;border-color:rgba(67, 65, 144, var(--divide-opacity))
  }.xl\\:divide-indigo-900>:not(template)~:not(template){--divide-opacity:1;border-color:#3c366b;border-color:rgba(60, 54, 107, var(--divide-opacity))
  }.xl\\:divide-purple-100>:not(template)~:not(template){--divide-opacity:1;border-color:#faf5ff;border-color:rgba(250, 245, 255, var(--divide-opacity))
  }.xl\\:divide-purple-200>:not(template)~:not(template){--divide-opacity:1;border-color:#e9d8fd;border-color:rgba(233, 216, 253, var(--divide-opacity))
  }.xl\\:divide-purple-300>:not(template)~:not(template){--divide-opacity:1;border-color:#d6bcfa;border-color:rgba(214, 188, 250, var(--divide-opacity))
  }.xl\\:divide-purple-400>:not(template)~:not(template){--divide-opacity:1;border-color:#b794f4;border-color:rgba(183, 148, 244, var(--divide-opacity))
  }.xl\\:divide-purple-500>:not(template)~:not(template){--divide-opacity:1;border-color:#9f7aea;border-color:rgba(159, 122, 234, var(--divide-opacity))
  }.xl\\:divide-purple-600>:not(template)~:not(template){--divide-opacity:1;border-color:#805ad5;border-color:rgba(128, 90, 213, var(--divide-opacity))
  }.xl\\:divide-purple-700>:not(template)~:not(template){--divide-opacity:1;border-color:#6b46c1;border-color:rgba(107, 70, 193, var(--divide-opacity))
  }.xl\\:divide-purple-800>:not(template)~:not(template){--divide-opacity:1;border-color:#553c9a;border-color:rgba(85, 60, 154, var(--divide-opacity))
  }.xl\\:divide-purple-900>:not(template)~:not(template){--divide-opacity:1;border-color:#44337a;border-color:rgba(68, 51, 122, var(--divide-opacity))
  }.xl\\:divide-pink-100>:not(template)~:not(template){--divide-opacity:1;border-color:#fff5f7;border-color:rgba(255, 245, 247, var(--divide-opacity))
  }.xl\\:divide-pink-200>:not(template)~:not(template){--divide-opacity:1;border-color:#fed7e2;border-color:rgba(254, 215, 226, var(--divide-opacity))
  }.xl\\:divide-pink-300>:not(template)~:not(template){--divide-opacity:1;border-color:#fbb6ce;border-color:rgba(251, 182, 206, var(--divide-opacity))
  }.xl\\:divide-pink-400>:not(template)~:not(template){--divide-opacity:1;border-color:#f687b3;border-color:rgba(246, 135, 179, var(--divide-opacity))
  }.xl\\:divide-pink-500>:not(template)~:not(template){--divide-opacity:1;border-color:#ed64a6;border-color:rgba(237, 100, 166, var(--divide-opacity))
  }.xl\\:divide-pink-600>:not(template)~:not(template){--divide-opacity:1;border-color:#d53f8c;border-color:rgba(213, 63, 140, var(--divide-opacity))
  }.xl\\:divide-pink-700>:not(template)~:not(template){--divide-opacity:1;border-color:#b83280;border-color:rgba(184, 50, 128, var(--divide-opacity))
  }.xl\\:divide-pink-800>:not(template)~:not(template){--divide-opacity:1;border-color:#97266d;border-color:rgba(151, 38, 109, var(--divide-opacity))
  }.xl\\:divide-pink-900>:not(template)~:not(template){--divide-opacity:1;border-color:#702459;border-color:rgba(112, 36, 89, var(--divide-opacity))
  }.xl\\:divide-primary>:not(template)~:not(template){--divide-opacity:1;border-color:#233D81;border-color:rgba(35, 61, 129, var(--divide-opacity))
  }.xl\\:divide-secondary>:not(template)~:not(template){--divide-opacity:1;border-color:#1C8FC0;border-color:rgba(28, 143, 192, var(--divide-opacity))
  }.xl\\:divide-tertiary>:not(template)~:not(template){--divide-opacity:1;border-color:#2AD78B;border-color:rgba(42, 215, 139, var(--divide-opacity))
  }.xl\\:divide-dark>:not(template)~:not(template){--divide-opacity:1;border-color:#03174B;border-color:rgba(3, 23, 75, var(--divide-opacity))
  }.xl\\:divide-smoke-darkest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.9)
  }.xl\\:divide-smoke-darker>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.75)
  }.xl\\:divide-smoke-dark>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.6)
  }.xl\\:divide-smoke>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.5)
  }.xl\\:divide-smoke-light>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.4)
  }.xl\\:divide-smoke-lighter>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.25)
  }.xl\\:divide-smoke-lightest>:not(template)~:not(template){border-color:rgba(0, 0, 0, 0.1)
  }.xl\\:divide-opacity-0>:not(template)~:not(template){--divide-opacity:0
  }.xl\\:divide-opacity-25>:not(template)~:not(template){--divide-opacity:0.25
  }.xl\\:divide-opacity-50>:not(template)~:not(template){--divide-opacity:0.5
  }.xl\\:divide-opacity-75>:not(template)~:not(template){--divide-opacity:0.75
  }.xl\\:divide-opacity-100>:not(template)~:not(template){--divide-opacity:1
  }}</style>`;

    		init(this, { target: this.shadowRoot }, instance, create_fragment, not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("omo-hello", Omo_hello);

    return Omo_hello;

}());
//# sourceMappingURL=omo-hello.svelte.js.map
