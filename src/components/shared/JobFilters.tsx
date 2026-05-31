"use client";

import { useRouter, usePathname } from "next/navigation";

interface Region {
  id: string;
  name: string;
  slug: string;
}

interface JobFiltersProps {
  regions: Region[];
  searchParams: Record<string, string>;
}

export default function JobFilters({ regions, searchParams }: JobFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Keyword</label>
        <input
          type="text"
          defaultValue={searchParams.keyword ?? ""}
          onChange={(e) => update("keyword", e.target.value)}
          placeholder="Job title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
        <select
          defaultValue={searchParams.regionSlug ?? ""}
          onChange={(e) => update("regionSlug", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Work type</label>
        <select
          defaultValue={searchParams.remoteType ?? ""}
          onChange={(e) => update("remoteType", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any</option>
          <option value="ONSITE">On-site</option>
          <option value="HYBRID">Hybrid</option>
          <option value="REMOTE">Remote</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min salary</label>
          <input
            type="number"
            defaultValue={searchParams.minSalary ?? ""}
            onChange={(e) => update("minSalary", e.target.value)}
            placeholder="e.g. 50000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Max salary</label>
          <input
            type="number"
            defaultValue={searchParams.maxSalary ?? ""}
            onChange={(e) => update("maxSalary", e.target.value)}
            placeholder="e.g. 200000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
