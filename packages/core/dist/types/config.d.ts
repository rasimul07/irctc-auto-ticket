export interface CardDetails {
    name?: string;
    number?: string;
    expiry?: string;
    cvv?: string;
}
export interface Credentials {
    username?: string;
    password?: string;
}
export interface Journey {
    from?: string;
    to?: string;
    date?: string;
    trainNo?: string;
    trainName?: string;
}
export interface Passenger {
    name?: string;
    age?: string;
    gender?: string;
}
export interface Preferences {
    bookingSite?: string;
    bookOnlyIfCnf?: boolean;
    autoPayEnabled?: boolean;
    paymentMethod?: string;
    autoPayType?: string;
    debitCard?: CardDetails;
    creditCard?: CardDetails;
}
export interface IrctcConfig {
    credentials?: Credentials;
    journey?: Journey;
    passengers?: Passenger[];
    preferences?: Preferences;
}
//# sourceMappingURL=config.d.ts.map