import type {ScryfallCard} from "./Scryfall.ts";

export enum CardTypes {
    Artifact = "Artifact",
    Conspiracy = "Conspiracy",
    Creature = "Creature",
    Enchantment = "Enchantment",
    Instant = "Instant",
    Land = "Land",
    Phenomenon = "Phenomenon",
    Plane = "Plane",
    Planeswalker = "Planeswalker",
    Scheme = "Scheme",
    Sorcery = "Sorcery",
    Tribal = "Tribal",
    Vanguard = "Vanguard",
}

export enum CardSubType {
    Advisor = "Advisor",
    Ajani = "Ajani",
    Alara = "Alara",
    Ally = "Ally",
    Angel = "Angel",
    Antelope = "Antelope",
    Ape = "Ape",
    Arcane = "Arcane",
}

export enum CardSuperType {
    Basic = "Basic",
    Legendary = "Legendary",
    Ongoing = "Ongoing",
    Snow = "Snow",
    World = "World",
}

export enum MtgColor {
    White = "White",
    Red = "Red",
    Blue = "Blue",
    Black = "Black",
    Green = "Green",
    Undefined = "Undefined",
    Colorless = "Colorless",
}

export enum MtgShortColor {
    White = "W",
    Red = "R",
    Blue = "U",
    Black = "B",
    Green = "G",
}

export enum Formats {
    AmonkhetBlock = "Amonkhet Block",
    BattleforZendikarBlock = "Battle for Zendikar Block",
    Classic = "Classic",
    Commander = "Commander",
    Extended = "Extended",
    Freeform = "Freeform",
    IceAgeBlock = "Ice Age Block",
    InnistradBlock = "Innistrad Block",
    InvasionBlock = "Invasion Block",
    KaladeshBlock = "Kaladesh Block",
    KamigawaBlock = "Kamigawa Block",
    KhansofTarkirBlock = "Khans of Tarkir Block",
    Legacy = "Legacy",
    LorwynShadowmoorBlock = "Lorwyn-Shadowmoor Block",
    MasquesBlock = "Masques Block",
    MirageBlock = "Mirage Block",
    MirrodinBlock = "Mirrodin Block",
    Modern = "Modern",
    OdysseyBlock = "Odyssey Block",
    OnslaughtBlock = "Onslaught Block",
    Prismatic = "Prismatic",
    RavnicaBlock = "Ravnica Block",
    ReturntoRavnicaBlock = "Return to Ravnica Block",
    ScarsofMirrodinBlock = "Scars of Mirrodin Block",
    ShadowsoverInnistradBlock = "Shadows over Innistrad Block",
    ShardsofAlaraBlock = "Shards of Alara Block",
    Singleton100 = "Singleton 100",
    Standard = "Standard",
    TempestBlock = "Tempest Block",
    TherosBlock = "Theros Block",
    TimeSpiralBlock = "Time Spiral Block",
    TribalWarsLegacy = "Tribal Wars Legacy",
    UnSets = "Un-Sets",
    UrzaBlock = "Urza Block",
    Vintage = "Vintage",
    ZendikarBlock = "Zendikar Block",
}

export interface Ruling {
    date: string;
    text: string;
}

export interface ForeignName {
    name: string;
    language: string;
    multiverseid: number;
}

export interface Legality {
    format: string;
    legality: string;
}

export interface CanHaveErrors {
    errors?: string[];
}

export interface Deck extends CanHaveErrors {
    library: Card[];
    commanders?: Card[];
    tokens?: Card[];
    attractions?: Card[];
    hand?: Card[];
    cardBackImageUrl?: string;
}

export interface CardLine {
    count?: number;
    name: string;
    set?: string;
    collectorNumber?: string;
    foil?: boolean;
    categories?: string[];
    colorTagData?: string;
}

export interface DeckImport {
    importInput: string;
    cardBackImageUrl?: string;
}

export interface Card extends ScryfallCard {
    inPlay?: boolean;
    playedTimes?: number;
    isCommander: boolean;
}