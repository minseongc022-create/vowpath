"""Oracle-specific exceptions."""


class OracleError(Exception):
    """Base error."""


class DataUnavailableError(OracleError):
    """Required market/fundamental data could not be fetched."""


class ConfigError(OracleError):
    """Invalid or missing configuration."""


class RiskHaltError(OracleError):
    """Portfolio risk halt engaged — no new risk allowed."""
