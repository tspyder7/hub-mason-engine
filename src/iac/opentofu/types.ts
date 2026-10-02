import type { IaCStackConfig } from '../types';

export type OpenTofuDriverConfig = IaCStackConfig;

export type OpenTofuFiles = {
    varsFile: string;
    planFile: string;
};
