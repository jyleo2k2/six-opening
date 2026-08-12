import { findAviationAndCosmeticsEducation } from "./aviation-cosmetics-education";
import { findAutomotiveAndShipbuildingEducation } from "./automotive-shipbuilding-education";
import { findDefenseEducation } from "./defense-education";
import { findEntertainmentAndRetailEducation } from "./entertainment-retail-education";
import { findFinancialEducation } from "./financial-education";
import { findFoodAndEnergyEducation } from "./food-energy-education";
import { findGameEducation } from "./game-education";
import { findLogisticsAndSemiconductorEducation } from "./logistics-semiconductor-education";

const EDUCATION_FINDERS = [
  findAviationAndCosmeticsEducation,
  findAutomotiveAndShipbuildingEducation,
  findDefenseEducation,
  findEntertainmentAndRetailEducation,
  findFinancialEducation,
  findFoodAndEnergyEducation,
  findGameEducation,
  findLogisticsAndSemiconductorEducation,
] as const;

export type ApprovedStockEducation = NonNullable<
  ReturnType<(typeof EDUCATION_FINDERS)[number]>
>;

export function findApprovedStockEducation(
  stockId: string,
): ApprovedStockEducation | undefined {
  for (const findEducation of EDUCATION_FINDERS) {
    const education = findEducation(stockId);
    if (education) return education;
  }
  return undefined;
}
