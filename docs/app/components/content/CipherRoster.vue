<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { CipherCategory } from "@agntn/ciphers";
import { CIPHERS, familyLabel, keyspaceParts, type CipherEntry } from "../../utils/ciphers";
import { ROSTER_CLASS, ROSTER_TABLE_UI } from "../../utils/roster";

interface Row {
  readonly entry: CipherEntry;
  readonly slug: string;
  readonly label: string;
  readonly category: string;
  readonly family: string;
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly keyspace: { short: string; full: string } | undefined;
}

/** One category only, the way `ciphers ciphers --category` lists it; every cipher when left out. */
const props = defineProps<{ category?: CipherCategory }>();

/** Every value comes from `info()`; the registry order is the default. */
const rows = computed<Row[]>(() =>
  CIPHERS.filter(
    (entry) => props.category === undefined || entry.info.category === props.category,
  ).map((entry) => ({
    entry,
    slug: entry.slug,
    label: entry.info.label,
    category: entry.info.category,
    family: familyLabel(entry.info.family),
    required: entry.info.options.filter((option) => option.required).map((option) => option.name),
    optional: entry.info.options.filter((option) => !option.required).map((option) => option.name),
    keyspace: keyspaceParts(entry.info),
  })),
);

const sorting = ref<{ id: string; desc: boolean }[]>([]);

const roster = useTemplateRef<HTMLElement>("roster");
useRosterFlip(
  () => roster.value,
  () => sorting.value,
);

const allColumns: TableColumn<Row>[] = [
  { accessorKey: "label", header: "Cipher", sortingFn: "text", meta: { class: { th: "w-[17rem]" } } },
  {
    accessorKey: "category",
    header: "Category",
    sortingFn: "text",
    meta: { class: { th: "w-[6.5rem]", td: "@max-[52rem]/roster:justify-self-end" } },
  },
  {
    accessorKey: "family",
    header: "Family",
    sortingFn: "text",
    meta: { class: { th: "w-[7.5rem]" } },
  },
  {
    id: "options",
    header: "Options",
    enableSorting: false,
    meta: { class: { td: "min-w-0" } },
  },
  {
    id: "keyspace",
    header: "Keyspace",
    enableSorting: false,
    meta: { class: { th: "w-[14rem]" } },
  },
];

/** A roster of one category drops the column that would say the same word forty times. */
const columns = computed(() =>
  allColumns.filter(
    (column) => !(props.category && "accessorKey" in column && column.accessorKey === "category"),
  ),
);

const order = computed(() => {
  const [first] = sorting.value;
  if (first === undefined) return "registry order";
  const label = allColumns.find(
    (column) => "accessorKey" in column && column.accessorKey === first.id,
  )?.header;
  return `by ${String(label).toLowerCase()} ${first.desc ? "descending" : "ascending"}`;
});
</script>

<template>
  <section ref="roster" class="roster not-prose my-6" aria-label="Ciphers">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header :class="ROSTER_CLASS.bar">
      <span :class="ROSTER_CLASS.title">{{
        category ? `ciphers ciphers --category ${category}` : "ciphers()"
      }}</span>
      <span :class="ROSTER_CLASS.meta">{{ rows.length }} {{ rows.length === 1 ? "cipher" : "ciphers" }} · {{ order }}</span>
    </header>
    <div class="roster-ruler" aria-hidden="true" />
    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :get-row-id="(row) => row.slug"
      :ui="ROSTER_TABLE_UI"
    >
      <template #label-header="{ column }"><RosterSort :column="column" label="Cipher" /></template>
      <template #category-header="{ column }"><RosterSort :column="column" label="Category" /></template>
      <template #family-header="{ column }"><RosterSort :column="column" label="Family" /></template>
      <template #label-cell="{ row }">
        <NuxtLink :to="row.original.entry.to" :class="[ROSTER_CLASS.name, 'max-w-full items-baseline']">
          <UIcon
            :name="row.original.entry.icon"
            class="relative top-0.5 size-3.5 flex-none"
            aria-hidden="true"
          />
          <span class="truncate">{{ row.original.label }}</span>
          <span :class="[ROSTER_CLASS.id, 'flex-none']">{{ row.original.slug }}</span>
        </NuxtLink>
      </template>
      <template #category-cell="{ row }">
        <span class="text-muted">{{ row.original.category }}</span>
      </template>
      <template #family-cell="{ row }">
        <span class="whitespace-nowrap text-muted">{{ row.original.family }}</span>
      </template>
      <template #options-cell="{ row }">
        <span v-if="row.original.required.length || row.original.optional.length" class="text-muted"
          ><template v-for="(name, index) in row.original.required" :key="name"
            ><span class="text-highlighted">{{ name }}</span
            ><template v-if="index < row.original.required.length - 1 || row.original.optional.length"
              >,
            </template></template
          ><template v-for="(name, index) in row.original.optional" :key="name"
            >{{ name }}<span class="text-dimmed">?</span
            ><template v-if="index < row.original.optional.length - 1">, </template></template
          ></span
        >
        <span v-else class="text-dimmed">none</span>
      </template>
      <template #keyspace-cell="{ row }">
        <span :class="ROSTER_CLASS.count"
          ><span :class="ROSTER_CLASS.leader" aria-hidden="true" /><UTooltip
            v-if="row.original.keyspace"
            :text="row.original.keyspace.full"
            ><span class="min-w-0 truncate text-highlighted" tabindex="0">{{
              row.original.keyspace.short
            }}</span></UTooltip
          ><span v-else class="whitespace-nowrap">not stated</span></span
        >
      </template>
    </UTable>
    <footer :class="ROSTER_CLASS.footer">
      <span>read from the registry in your browser / no network</span>
      <span :class="ROSTER_CLASS.meta">a name with ? is optional</span>
    </footer>
  </section>
</template>
