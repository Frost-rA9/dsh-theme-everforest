/**
 * Host half of the Everforest theme pack.
 *
 * The pack is a single-provider bundle: the browser half owns the palette
 * token layer and the Settings → General picker, so the Host contributes no
 * behavior, no config schema, and no dependency. It exists so the bundle has
 * a Loader row whose Client declaration (`dsh.client`) is served to the page.
 */
export function apply() {}
