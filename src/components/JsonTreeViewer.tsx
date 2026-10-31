import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Code2,
  Layers,
} from 'lucide-react';

interface JsonTreeViewerProps {
  data: unknown;
  rootName?: string;
  initialExpandedDepth?: number;
}

interface TreeNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
  path: string;
  searchTerm: string;
  onCopyValue: (val: string) => void;
  copiedPath: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  keyName,
  value,
  depth,
  expandedPaths,
  togglePath,
  path,
  searchTerm,
  onCopyValue,
  copiedPath,
}) => {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isExpanded = expandedPaths.has(path);

  // Check if matches search
  const isSearchMatch =
    searchTerm.trim() !== '' &&
    ((keyName && keyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (!isObject && String(value).toLowerCase().includes(searchTerm.toLowerCase())));

  // Render Primitive Values
  const renderPrimitive = (val: unknown) => {
    if (val === null) {
      return <span className="text-slate-500 italic">null</span>;
    }
    if (val === undefined) {
      return <span className="text-slate-500 italic">undefined</span>;
    }
    if (typeof val === 'string') {
      const isToken = val.startsWith('pm_') || val.startsWith('tok_') || val.startsWith('card_');
      return (
        <span className={isToken ? 'text-indigo-300 font-semibold underline decoration-indigo-500/40' : 'text-emerald-300'}>
          &quot;{val}&quot;
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="text-amber-300 font-mono tabular-nums">{val}</span>;
    }
    if (typeof val === 'boolean') {
      return <span className="text-purple-300 font-mono font-semibold">{val ? 'true' : 'false'}</span>;
    }
    return <span className="text-slate-300">{String(val)}</span>;
  };

  if (!isObject) {
    return (
      <div
        className={`flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-slate-800/40 font-mono text-xs group transition-colors ${
          isSearchMatch ? 'bg-amber-500/10 border-l-2 border-amber-400 pl-1.5' : ''
        }`}
        style={{ paddingLeft: `${depth * 14 + 16}px` }}
      >
        {keyName && (
          <span className="text-slate-400 font-medium">
            &quot;<span className="text-indigo-200">{keyName}</span>&quot;:
          </span>
        )}
        <span className="ml-1">{renderPrimitive(value)}</span>
        <button
          onClick={() => onCopyValue(typeof value === 'string' ? value : JSON.stringify(value))}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-slate-300 ml-1 transition-opacity cursor-pointer"
          title="Copy value"
        >
          {copiedPath === path ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  const count = entries.length;

  return (
    <div className="font-mono text-xs select-text">
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded hover:bg-slate-800/50 cursor-pointer group transition-colors ${
          isSearchMatch ? 'bg-amber-500/10 border-l-2 border-amber-400' : ''
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => togglePath(path)}
      >
        <span className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </span>

        {keyName && (
          <span className="text-slate-400 font-medium">
            &quot;<span className="text-indigo-300">{keyName}</span>&quot;:
          </span>
        )}

        <span className="text-slate-500 ml-1">
          {isArray ? '[' : '{'}
        </span>

        {!isExpanded && (
          <span className="text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-800/80 rounded border border-slate-700/60 font-sans mx-1">
            {count} {isArray ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'key' : 'keys')}
          </span>
        )}

        {!isExpanded && (
          <span className="text-slate-500">
            {isArray ? ']' : '}'}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="border-l border-slate-800/80 ml-2.5">
          {entries.map(([childKey, childVal]) => (
            <TreeNode
              key={childKey}
              keyName={isArray ? undefined : childKey}
              value={childVal}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              togglePath={togglePath}
              path={`${path}.${childKey}`}
              searchTerm={searchTerm}
              onCopyValue={onCopyValue}
              copiedPath={copiedPath}
            />
          ))}
          <div
            className="text-slate-500 py-0.5 pl-2"
            style={{ paddingLeft: `${depth * 14 + 16}px` }}
          >
            {isArray ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  );
};

export const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  rootName = 'response',
  initialExpandedDepth = 2,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Initialize paths up to initialExpandedDepth
  const getAllPaths = (obj: unknown, currentPath = 'root', maxDepth = 4, depth = 0): string[] => {
    if (!obj || typeof obj !== 'object' || depth >= maxDepth) return [currentPath];
    const paths = [currentPath];
    const entries = Array.isArray(obj)
      ? (obj as unknown[]).map((val, idx) => [String(idx), val] as const)
      : Object.entries(obj as Record<string, unknown>);
    for (const [key, val] of entries) {
      if (val && typeof val === 'object') {
        paths.push(...getAllPaths(val, `${currentPath}.${key}`, maxDepth, depth + 1));
      }
    }
    return paths;
  };

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    return new Set(getAllPaths(data, 'root', initialExpandedDepth));
  });

  useEffect(() => {
    setExpandedPaths(new Set(getAllPaths(data, 'root', initialExpandedDepth)));
  }, [data, initialExpandedDepth]);

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPaths(new Set(getAllPaths(data, 'root', 10)));
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['root']));
  };

  const copyFullJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyValue = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedPath(val);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Control Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Interactive Tree</span>
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3 text-emerald-400" />
            <span>Raw JSON</span>
          </button>
        </div>

        {/* Center: Search Filter in Tree View */}
        {viewMode === 'tree' && (
          <div className="relative flex-1 max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3 h-3" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search keys, values, checks..."
              className="w-full pl-7 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Right: Expand/Collapse & Copy Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {viewMode === 'tree' && (
            <>
              <button
                onClick={expandAll}
                className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Expand all nodes"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Expand All</span>
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Collapse all nodes"
              >
                <Minimize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Collapse</span>
              </button>
            </>
          )}

          <button
            onClick={copyFullJson}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy entire JSON"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 max-h-[380px] overflow-y-auto overflow-x-auto">
        {viewMode === 'tree' ? (
          <TreeNode
            keyName={rootName}
            value={data}
            depth={0}
            expandedPaths={expandedPaths}
            togglePath={togglePath}
            path="root"
            searchTerm={searchTerm}
            onCopyValue={handleCopyValue}
            copiedPath={copiedPath}
          />
        ) : (
          <pre className="font-mono text-xs text-emerald-300/90 leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
