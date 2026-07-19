/**
 * Inline (pre-hydration) script: browser extensions — Bitdefender
 * (bis_skin_checked / bis_register), form fillers (fdprocessedid) — stamp
 * attributes on elements BEFORE React hydrates, producing endless dev-console
 * hydration warnings on every page. This strips those attributes immediately
 * and keeps stripping as extensions re-add them, so the hydration diff never
 * sees them. Injected as the first <script> in <body> of both root layouts.
 */
export const EXT_ATTR_CLEANER = `(function(){
var A=['bis_skin_checked','bis_register','fdprocessedid'];
var strip=function(el){if(el&&el.nodeType===1){for(var i=0;i<A.length;i++)el.removeAttribute(A[i]);}};
var sweep=function(root){if(!root||!root.querySelectorAll)return;strip(root);
var hit=root.querySelectorAll('['+A.join('],[')+']');for(var i=0;i<hit.length;i++)strip(hit[i]);};
sweep(document.documentElement);
new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var m=muts[i];
if(m.type==='attributes')strip(m.target);
else for(var j=0;j<m.addedNodes.length;j++)sweep(m.addedNodes[j]);}})
.observe(document.documentElement,{attributes:true,attributeFilter:A,childList:true,subtree:true});
})();`;
