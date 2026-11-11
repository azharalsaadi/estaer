import { useQuery } from "@tanstack/react-query"
import { listAllCategoriesApi } from "../apis/categories.api"

export const useAllCategories = () =>
  useQuery({
    queryKey: ["categories", "all"],
    queryFn: listAllCategoriesApi,
  })
