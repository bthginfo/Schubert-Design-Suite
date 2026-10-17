<script lang="ts">import {statusTone,statuses} from '#lib/client/api.ts';let {value}:{value:string}=$props();</script>
<span class="status {statusTone(value||'')}"><span class="status-dot"></span>{statuses[value]||value||'Ohne Status'}</span>
