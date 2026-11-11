import { useQuery } from "@tanstack/react-query"
import { listActiveCategoriesApi } from "../apis/categories.api"

export const useActiveCategories = () =>
  useQuery({
    queryKey: ["categories", "active"],
    queryFn: listActiveCategoriesApi,
  })
