from setuptools import setup, find_packages

setup(
    name="ots",
    version="0.1.0",
    description="Okul Takip Sistemi",
    packages=find_packages(),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "ots=ots.cli:run",
        ],
    },
)
