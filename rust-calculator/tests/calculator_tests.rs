// Import evaluate_expression from the rust_calculator crate
use rust_calculator::evaluate_expression;

#[cfg(test)]
mod tests {
    use super::*;
    
    // Basic arithmetic tests
    #[test]
    fn test_addition() {
        assert_eq!(evaluate_expression("2 + 3").unwrap(), 5);
        assert_eq!(evaluate_expression("10 + 20").unwrap(), 30);
        assert_eq!(evaluate_expression("0 + 0").unwrap(), 0);
        assert_eq!(evaluate_expression("999 + 1").unwrap(), 1000);
    }
    
    #[test]
    fn test_subtraction() {
        assert_eq!(evaluate_expression("5 - 3").unwrap(), 2);
        assert_eq!(evaluate_expression("10 - 20").unwrap(), -10); // Negative result is allowed
        assert_eq!(evaluate_expression("0 - 0").unwrap(), 0);
        assert_eq!(evaluate_expression("1000 - 1").unwrap(), 999);
    }
    
    #[test]
    fn test_multiplication() {
        assert_eq!(evaluate_expression("2 * 3").unwrap(), 6);
        assert_eq!(evaluate_expression("10 * 20").unwrap(), 200);
        assert_eq!(evaluate_expression("0 * 5").unwrap(), 0);
        assert_eq!(evaluate_expression("100 * 10").unwrap(), 1000);
    }
    
    #[test]
    fn test_division() {
        assert_eq!(evaluate_expression("6 / 3").unwrap(), 2);
        assert_eq!(evaluate_expression("10 / 20").unwrap(), 0); // Integer division
        assert_eq!(evaluate_expression("5 / 2").unwrap(), 2);   // Integer division
        assert_eq!(evaluate_expression("1000 / 10").unwrap(), 100);
    }
    
    // Precedence tests
    #[test]
    fn test_precedence() {
        assert_eq!(evaluate_expression("2 + 3 * 4").unwrap(), 14);
        assert_eq!(evaluate_expression("2 * 3 + 4").unwrap(), 10);
        assert_eq!(evaluate_expression("10 / 5 + 3").unwrap(), 5);
        assert_eq!(evaluate_expression("10 - 3 * 2").unwrap(), 4);
    }
    
    // Parentheses tests
    #[test]
    fn test_parentheses() {
        assert_eq!(evaluate_expression("(2 + 3) * 4").unwrap(), 20);
        assert_eq!(evaluate_expression("2 * (3 + 4)").unwrap(), 14);
        assert_eq!(evaluate_expression("(10 / 5) + 3").unwrap(), 5);
        assert_eq!(evaluate_expression("10 - (3 * 2)").unwrap(), 4);
        assert_eq!(evaluate_expression("((10 - 3) * 2)").unwrap(), 14);
        assert_eq!(evaluate_expression("(2 + 3) * (4 + 5)").unwrap(), 45);
    }
    
    // Whitespace tests
    #[test]
    fn test_whitespace() {
        assert_eq!(evaluate_expression("2+3").unwrap(), 5);
        assert_eq!(evaluate_expression(" 2 + 3 ").unwrap(), 5);
        assert_eq!(evaluate_expression("2  +  3").unwrap(), 5);
        assert_eq!(evaluate_expression("\t2\t+\t3\t").unwrap(), 5);
        assert_eq!(evaluate_expression("\n2\n+\n3\n").unwrap(), 5);
    }
    
    // Complex expression tests
    #[test]
    fn test_complex_expressions() {
        assert_eq!(evaluate_expression("2 + 3 * 4 - 5").unwrap(), 9);
        assert_eq!(evaluate_expression("(2 + 3) * (4 - 5)").unwrap(), -5);
        assert_eq!(evaluate_expression("10 / 2 + 3 * 4").unwrap(), 17);
        assert_eq!(evaluate_expression("(10 + 2) / 3").unwrap(), 4);
        assert_eq!(evaluate_expression("((10 + 2) / 3) * 5").unwrap(), 20);
    }
    
    // Error tests
    #[test]
    fn test_division_by_zero() {
        assert!(evaluate_expression("5 / 0").is_err());
    }
    
    #[test]
    fn test_invalid_characters() {
        assert!(evaluate_expression("2 + a").is_err());
        assert!(evaluate_expression("2 $ 3").is_err());
        assert!(evaluate_expression("2 ^ 3").is_err());
    }
    
    #[test]
    fn test_mismatched_parentheses() {
        assert!(evaluate_expression("(2 + 3").is_err());
        assert!(evaluate_expression("2 + 3)").is_err());
        assert!(evaluate_expression("((2 + 3)").is_err());
    }
    
    #[test]
    fn test_invalid_expressions() {
        assert!(evaluate_expression("").is_err());
        assert!(evaluate_expression("2 +").is_err());
        assert!(evaluate_expression("+ 2").is_err());
        assert!(evaluate_expression("2 2").is_err());
    }
    
    // Large number tests
    #[test]
    fn test_large_numbers() {
        assert_eq!(evaluate_expression("1000000 + 1000000").unwrap(), 2000000);
        assert_eq!(evaluate_expression("1000000 * 2").unwrap(), 2000000);
        assert_eq!(evaluate_expression("2000000 / 2").unwrap(), 1000000);
    }
}