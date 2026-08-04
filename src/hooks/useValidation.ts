import { useCallback } from 'react'
import { useFlowStore } from '../store/flowStore'
import { validateFlow } from '../utils/validation'

/** 현재 캔버스의 순서도를 검사하여 ValidationResult를 반환하는 훅 */
export function useValidation() {
  const nodes = useFlowStore(s => s.nodes)
  const edges = useFlowStore(s => s.edges)

  const validate = useCallback(() => {
    return validateFlow(nodes, edges)
  }, [nodes, edges])

  return { validate }
}
