<script lang="ts">
  import type {AppData,Row} from '#lib/client/types.ts';import {label,display} from '#lib/client/api.ts';
  let {value={},data}:{value?:Row;data:AppData}=$props();
</script>
<dl class="data-preview">{#each Object.entries(value||{}) as [key,item]}<div><dt>{label(key)}</dt><dd>{display(item,key,data)}</dd></div>{/each}</dl>
<style>.data-preview{margin:0;display:grid;gap:12px;min-width:0}.data-preview div{min-width:0}.data-preview dt{font-size:12px;color:var(--muted);margin-bottom:3px}.data-preview dd{margin:0;font-size:14px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}</style>
