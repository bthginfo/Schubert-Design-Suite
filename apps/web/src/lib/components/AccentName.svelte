<script lang="ts">
 import {accentNames,darkAccentNames,type Appearance} from '@schubert/contracts';
 let {accent,mode}:{accent:Appearance['accent'];mode:Appearance['mode']}=$props();
</script>
<span data-mode={mode}><span class="light-name">{accentNames[accent]}</span><span class="dark-name">{darkAccentNames[accent]}</span></span>
<style>.dark-name,[data-mode=dark] .light-name{display:none}[data-mode=dark] .dark-name{display:inline}@media(prefers-color-scheme:dark){[data-mode=system] .light-name{display:none}[data-mode=system] .dark-name{display:inline}}</style>
