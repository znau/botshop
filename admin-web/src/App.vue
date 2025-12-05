<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { RouterView } from 'vue-router'
</script>

<template>
	<n-config-provider>
		<n-dialog-provider>
			<n-message-provider>
				<RouterView />
			</n-message-provider>
		</n-dialog-provider>
	</n-config-provider>
</template>
