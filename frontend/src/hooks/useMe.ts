import { useQuery } from "@tanstack/react-query";

import { endpoints } from "../api/endpoints";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: endpoints.me, retry: false });
