import { useCallback, useMemo, useRef, DependencyList } from 'react'

/**
 * Custom hook for deep memoization of objects
 * Useful when you need to memoize objects that are recreated on every render
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ value: T; deps: DependencyList }>()
  
  if (!ref.current || !areDepsEqual(deps, ref.current.deps)) {
    ref.current = { value: factory(), deps }
  }
  
  return ref.current.value
}

/**
 * Custom hook for throttled callbacks
 * Prevents excessive re-renders from rapid state changes
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastCallRef = useRef<number>(0)
  
  return useCallback(
    ((...args) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current
      
      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        return callback(...args)
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now()
        callback(...args)
      }, delay - timeSinceLastCall)
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, delay]
  )
}

/**
 * Custom hook for debounced callbacks
 * Delays execution until after a period of inactivity
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, delay]
  )
}

/**
 * Helper to check if dependency arrays are equal
 */
function areDepsEqual(deps1: DependencyList, deps2: DependencyList): boolean {
  if (deps1.length !== deps2.length) {
    return false
  }
  
  for (let i = 0; i < deps1.length; i++) {
    if (!Object.is(deps1[i], deps2[i])) {
      return false
    }
  }
  
  return true
}

/**
 * Custom comparison function for React.memo
 * Performs shallow comparison with option to ignore specific props
 */
export function createMemoComparison<P extends Record<string, any>>(
  ignoreProps?: (keyof P)[]
) {
  return (prevProps: P, nextProps: P): boolean => {
    const prevKeys = Object.keys(prevProps) as (keyof P)[]
    const nextKeys = Object.keys(nextProps) as (keyof P)[]
    
    // Check if the number of props is different
    if (prevKeys.length !== nextKeys.length) {
      return false
    }
    
    // Check each prop
    for (const key of prevKeys) {
      // Skip ignored props
      if (ignoreProps?.includes(key)) {
        continue
      }
      
      // Check if props are different
      if (!Object.is(prevProps[key], nextProps[key])) {
        return false
      }
    }
    
    return true
  }
}

/**
 * Memoized filter function for arrays
 * Only recalculates when array or filter function changes
 */
export function useMemoizedFilter<T>(
  array: T[],
  filterFn: (item: T) => boolean
): T[] {
  return useMemo(() => array.filter(filterFn), [array, filterFn])
}

/**
 * Memoized sort function for arrays
 * Only recalculates when array or sort function changes
 */
export function useMemoizedSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    const sorted = [...array]
    if (compareFn) {
      sorted.sort(compareFn)
    } else {
      sorted.sort()
    }
    return sorted
  }, [array, compareFn])
}

/**
 * Memoized map function for arrays
 * Only recalculates when array or map function changes
 */
export function useMemoizedMap<T, R>(
  array: T[],
  mapFn: (item: T, index: number) => R
): R[] {
  return useMemo(() => array.map(mapFn), [array, mapFn])
}

/**
 * Hook for expensive computations with caching
 */
export function useComputedValue<T, D extends DependencyList>(
  compute: (...deps: D) => T,
  deps: D,
  options?: {
    cacheSize?: number
    cacheKey?: (...deps: D) => string
  }
): T {
  const { cacheSize = 1, cacheKey } = options || {}
  const cacheRef = useRef<Map<string, T>>(new Map())
  
  return useMemo(() => {
    const key = cacheKey ? cacheKey(...deps) : JSON.stringify(deps)
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key)!
    }
    
    const value = compute(...deps)
    
    // Manage cache size
    if (cacheRef.current.size >= cacheSize) {
      const firstKey = cacheRef.current.keys().next().value
      cacheRef.current.delete(firstKey)
    }
    
    cacheRef.current.set(key, value)
    return value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}